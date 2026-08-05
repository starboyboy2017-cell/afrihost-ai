/**
 * Module 25 — Channel Manager / OTA : service métier.
 *
 * Moteur de connecteurs générique (Connector Framework) :
 *   - comptes OTA configurables par hôtel (identifiants/tokens/secrets en base,
 *     sans modification de code) ;
 *   - mappings chambres PMS ↔ chambres OTA ;
 *   - sync bidirectionnelle : disponibilités, tarifs, restrictions (outbound) ;
 *     réservations, modifications, annulations (inbound) ;
 *   - prévention des doubles réservations (déduplication par otaBookingId) ;
 *   - inventaires multi-hôtels (chacun isolé par RLS) ;
 *   - file d'attente + reprise automatique (retry exponentiel) ;
 *   - logs détaillés, alertes d'erreur, statistiques.
 *
 * Provider-agnostic : le service travaille avec des connecteurs (`OtaConnector`)
 * résolus par `otaKey` ; aucun OTA concret n'est importé. Isolation multihôtel +
 * RBAC channel.*.
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { ChannelError } from "./channel.error.js";
import type { ConnectorRegistry } from "./channel.connector.js";
import type { ChannelRepository } from "./channel.repository.js";
import type {
  ChannelAccount,
  ChannelRoomMapping,
  ChannelSyncJob,
  ChannelSyncLog,
  CreateChannelAccountInput,
  CreateMappingInput,
  InboundBooking,
  ProcessBookingInput,
  PushAvailabilityInput,
  PushRatesInput,
  PushRestrictionsInput,
  RestrictionUpdate,
  SyncType,
} from "./channel.types.js";
import {
  validateCreateChannelAccount,
  validateCreateMapping,
  validateProcessBooking,
  validatePushAvailability,
  validatePushRates,
  validatePushRestrictions,
} from "./channel.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface ChannelActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;

export class ChannelService {
  constructor(
    private readonly repo: ChannelRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
    private readonly connectors: ConnectorRegistry = {},
  ) {}

  // ---------------------------------------------------------------------------
  // Comptes OTA
  // ---------------------------------------------------------------------------

  async createAccount(hotelId: string, input: CreateChannelAccountInput, actor: ChannelActor): Promise<ChannelAccount> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateChannelAccount(input);
    const account = await this.repo.createAccount(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "channel.account.create", entityType: "ChannelAccount", entityId: account.id, after: { name: v.name, otaKey: v.otaKey } });
    return account;
  }

  async listAccounts(hotelId: string, actor: ChannelActor): Promise<ChannelAccount[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listAccounts(hotelId);
  }

  async setAccountActive(hotelId: string, accountId: string, isActive: boolean, actor: ChannelActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setAccountActive(hotelId, accountId, isActive);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "channel.account.toggle", entityType: "ChannelAccount", entityId: accountId, after: { isActive } });
  }

  /** Teste la connexion à l'OTA via le connecteur (provider-agnostic). */
  async testConnection(hotelId: string, accountId: string, actor: ChannelActor): Promise<{ ok: boolean; error?: string }> {
    this.assertHotel(hotelId, actor);
    const account = await this.repo.getAccountForSync(hotelId, accountId);
    if (!account) throw new ChannelError("Compte OTA introuvable");
    const connector = this.connectors[account.otaKey];
    if (!connector) return { ok: false, error: `Aucun connecteur pour "${account.otaKey}"` };
    const res = await connector.testConnection(account);
    return { ok: res.ok, error: res.error };
  }

  // ---------------------------------------------------------------------------
  // Mappings
  // ---------------------------------------------------------------------------

  async createMapping(hotelId: string, input: CreateMappingInput, actor: ChannelActor): Promise<ChannelRoomMapping> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateMapping(input);
    const mapping = await this.repo.createMapping(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "channel.mapping.create", entityType: "ChannelRoomMapping", entityId: mapping.id, after: { roomTypeId: v.roomTypeId, otaRoomId: v.otaRoomId } });
    return mapping;
  }

  async listMappings(hotelId: string, accountId: string | undefined, actor: ChannelActor): Promise<ChannelRoomMapping[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listMappings(hotelId, accountId);
  }

  async setMappingActive(hotelId: string, mappingId: string, isActive: boolean, actor: ChannelActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setMappingActive(hotelId, mappingId, isActive);
  }

  // ---------------------------------------------------------------------------
  // Synchronisation OUTBOUND (PMS → OTA)
  // ---------------------------------------------------------------------------

  /** Pousse les disponibilités via la file d'attente. */
  async pushAvailability(hotelId: string, input: PushAvailabilityInput, actor: ChannelActor): Promise<ChannelSyncJob> {
    this.assertHotel(hotelId, actor);
    const v = validatePushAvailability(input);
    const account = await this.repo.getAccountForSync(hotelId, v.accountId);
    if (!account) throw new ChannelError("Compte OTA introuvable");
    const payload = { updates: v.updates };
    const job = await this.enqueue(hotelId, v.accountId, "outbound", "availability", payload, actor);
    await this.writeLog(hotelId, v.accountId, `Disponibilité en file : ${v.updates.length} jour(s)`, job.id, actor);
    return job;
  }

  /** Pousse les tarifs. */
  async pushRates(hotelId: string, input: PushRatesInput, actor: ChannelActor): Promise<ChannelSyncJob> {
    this.assertHotel(hotelId, actor);
    const v = validatePushRates(input);
    await this.repo.getAccountForSync(hotelId, v.accountId).then((a) => { if (!a) throw new ChannelError("Compte OTA introuvable"); });
    const job = await this.enqueue(hotelId, v.accountId, "outbound", "rates", { updates: v.updates }, actor);
    // Consigner les tarifs poussés
    for (const u of v.updates) {
      await this.repo.recordRateOverride(hotelId, { accountId: v.accountId, roomTypeId: u.roomTypeId, ratePlanId: u.ratePlanId ?? null, date: new Date(u.date), price: u.price, currency: u.currency ?? "XOF", status: "PENDING" });
    }
    await this.writeLog(hotelId, v.accountId, `Tarifs en file : ${v.updates.length} entrée(s)`, job.id, actor);
    return job;
  }

  /** Pousse les restrictions. */
  async pushRestrictions(hotelId: string, input: PushRestrictionsInput, actor: ChannelActor): Promise<ChannelSyncJob> {
    this.assertHotel(hotelId, actor);
    const v = validatePushRestrictions(input);
    await this.repo.getAccountForSync(hotelId, v.accountId).then((a) => { if (!a) throw new ChannelError("Compte OTA introuvable"); });
    const job = await this.enqueue(hotelId, v.accountId, "outbound", "restrictions", { updates: v.updates }, actor);
    await this.writeLog(hotelId, v.accountId, `Restrictions en file : ${v.updates.length} jour(s)`, job.id, actor);
    return job;
  }

  // ---------------------------------------------------------------------------
  // Synchronisation INBOUND (OTA → PMS)
  // ---------------------------------------------------------------------------

  /** Reçoit une réservation OTA (avec prévention des doubles). */
  async processBooking(hotelId: string, input: ProcessBookingInput, actor: ChannelActor): Promise<ChannelSyncJob> {
    this.assertHotel(hotelId, actor);
    const v = validateProcessBooking(input);
    const account = await this.repo.getAccountForSync(hotelId, v.accountId);
    if (!account) throw new ChannelError("Compte OTA introuvable");
    const job = await this.enqueue(hotelId, v.accountId, "inbound", "booking", { booking: v.booking }, actor);
    await this.writeLog(hotelId, v.accountId, `Réservation ${v.booking.otaBookingId} reçue (file)`, job.id, actor);
    return job;
  }

  /** Pull des réservations depuis l'OTA (appelé par cron/worker). */
  async pullBookings(hotelId: string, accountId: string, actor: ChannelActor): Promise<ChannelSyncJob> {
    this.assertHotel(hotelId, actor);
    await this.repo.getAccountForSync(hotelId, accountId).then((a) => { if (!a) throw new ChannelError("Compte OTA introuvable"); });
    return this.enqueue(hotelId, accountId, "inbound", "booking", {}, actor);
  }

  // ---------------------------------------------------------------------------
  // Traitement de la file d'attente
  // ---------------------------------------------------------------------------

  /** Traite les jobs dus (retries inclus) via les connecteurs. */
  async processDue(hotelId: string, actor: ChannelActor, limit = 20): Promise<number> {
    this.assertHotel(hotelId, actor);
    const due = await this.repo.claimDueJobs(hotelId, new Date(), limit);
    let processed = 0;
    for (const job of due) {
      await this.repo.markJobRunning(hotelId, job.id);
      try {
        await this.executeJob(hotelId, job, actor);
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur de synchronisation";
        await this.handleJobFailure(hotelId, job, msg, actor);
      }
    }
    return processed;
  }

  private async executeJob(hotelId: string, job: ChannelSyncJob, actor: ChannelActor): Promise<void> {
    const account = await this.repo.getAccountForSync(hotelId, job.accountId);
    if (!account) throw new ChannelError("Compte OTA introuvable");
    const connector = this.connectors[account.otaKey];
    // Sans connecteur (aucun OTA branché) → on considère le job traité (log INFO).
    if (!connector) {
      await this.repo.markJobSuccess(hotelId, job.id, { skipped: true, reason: `no connector for ${account.otaKey}` });
      await this.writeLog(hotelId, job.accountId, `Aucun connecteur pour "${account.otaKey}" — job ignoré (mode démo)`, job.id, actor, "INFO");
      await this.repo.updateAccountSync(hotelId, job.accountId, new Date(), null);
      return;
    }
    // Résolution du mapping
    const mappings = await this.repo.getMappingsForAccount(hotelId, job.accountId);
    const mappingByRoom = new Map(mappings.map((m) => [m.roomTypeId, m]));

    let res;
    switch (job.type) {
      case "availability": {
        const updates = (job.payload as { updates?: Array<{ date: string; rooms: number }> })?.updates ?? [];
        res = await connector.pushAvailability(account, updates.map((u) => ({ date: u.date, roomTypeId: "", value: u.rooms })));
        break;
      }
      case "rates": {
        const updates = (job.payload as { updates?: Array<{ date: string; roomTypeId: string; price: number }> })?.updates ?? [];
        res = await connector.pushRates(account, updates.map((u) => ({ date: u.date, roomTypeId: u.roomTypeId, otaRoomId: mappingByRoom.get(u.roomTypeId)?.otaRoomId ?? null, value: u.price })));
        break;
      }
      case "restrictions": {
        const updates = (job.payload as { updates?: RestrictionUpdate[] })?.updates ?? [];
        res = await connector.pushRestrictions(account, updates.map((u) => ({ date: u.date, roomTypeId: u.roomTypeId, otaRoomId: mappingByRoom.get(u.roomTypeId)?.otaRoomId ?? null, value: u.stopSell ? 1 : 0, meta: { minStay: u.minStay, maxStay: u.maxStay, closedToArrival: u.closedToArrival, closedToDeparture: u.closedToDeparture } })));
        break;
      }
      case "booking":
        // Inbound : appelé par le webhook / pull ; ici on pull si payload vide.
        res = await connector.pullBookings(account);
        break;
      case "cancellation":
        res = await connector.pullBookings(account);
        break;
      default:
        res = { ok: false, error: `Type de job non supporté : ${job.type}` };
    }

    if (!res.ok) throw new ChannelError(res.error ?? "Échec connecteur");
    await this.repo.markJobSuccess(hotelId, job.id, res.data as Record<string, unknown> | null);
    await this.writeLog(hotelId, job.accountId, `Synchronisation ${job.type} réussie`, job.id, actor, "INFO");
    await this.repo.updateAccountSync(hotelId, job.accountId, new Date(), null);
    await this.bus.publish({ name: DomainEvents.channelSynced, hotelId, organisationId: actor.organisationId, data: { jobId: job.id, type: job.type, accountId: job.accountId } });
  }

  private async handleJobFailure(hotelId: string, job: ChannelSyncJob, error: string, actor: ChannelActor): Promise<void> {
    await this.repo.updateAccountSync(hotelId, job.accountId, new Date(), error);
    await this.writeLog(hotelId, job.accountId, `Échec synchronisation ${job.type} : ${error}`, job.id, actor, "ERROR");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "channel.sync.error", entityType: "ChannelSyncJob", entityId: job.id, after: { type: job.type, error } });
    const nextAttempt = job.attempts + 1;
    if (nextAttempt >= job.maxAttempts) {
      await this.repo.markJobFailed(hotelId, job.id, error, null);
    } else {
      const retryAt = this.backoff(nextAttempt);
      await this.repo.markJobRetrying(hotelId, job.id, retryAt, error);
    }
  }

  private backoff(attempt: number): Date {
    const minutes = Math.min(Math.pow(2, attempt) * 1, 120);
    return new Date(Date.now() + minutes * 60_000);
  }

  // ---------------------------------------------------------------------------
  // Logs & statistiques
  // ---------------------------------------------------------------------------

  async listLogs(hotelId: string, accountId: string | undefined, actor: ChannelActor): Promise<ChannelSyncLog[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listLogs(hotelId, accountId, 200);
  }

  async listJobs(hotelId: string, status: SyncType | undefined, actor: ChannelActor): Promise<ChannelSyncJob[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listJobs(hotelId, status as never, 200);
  }

  async syncStats(hotelId: string, accountId: string | undefined, actor: ChannelActor): Promise<{ totalJobs: number; success: number; failed: number; pending: number; logs: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.syncStats(hotelId, accountId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async enqueue(hotelId: string, accountId: string, direction: "outbound" | "inbound", type: SyncType, payload: Record<string, unknown>, actor: ChannelActor): Promise<ChannelSyncJob> {
    const job = await this.repo.enqueueJob(hotelId, { accountId, direction, type, payload, maxAttempts: DEFAULT_MAX_ATTEMPTS });
    await this.bus.publish({ name: DomainEvents.channelJobEnqueued, hotelId, organisationId: actor.organisationId, data: { jobId: job.id, type, direction } });
    return job;
  }

  private async writeLog(hotelId: string, accountId: string, message: string, jobId?: string | null, actor?: ChannelActor, level = "INFO"): Promise<void> {
    await this.repo.writeLog(hotelId, { accountId, jobId: jobId ?? null, level, message });
  }

  private assertHotel(hotelId: string, actor: ChannelActor): void {
    if (actor.hotelId !== hotelId) throw new ChannelError("Accès inter-hôtel refusé");
  }
}
