/**
 * Module 31 — Plateforme Mobile : service métier.
 *
 * PWA avancée + API-first. Offline-first, synchronisation automatique,
 * notifications push, installation native, optimisation mobile, tableau de
 * bord par rôle. Le même backend alimente la PWA et les futures apps Android/iOS.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC mobile.*. Audit.
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { MobileError } from "./mobile.error.js";
import type { MobileRepository } from "./mobile.repository.js";
import type {
  MobileDashboard,
  MobileDevice,
  MobileSyncLog,
  PushToken,
  RegisterDeviceInput,
  RegisterPushTokenInput,
  SyncOperation,
} from "./mobile.types.js";
import {
  validateRegisterDevice,
  validateRegisterPushToken,
  validateSyncOperation,
} from "./mobile.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface MobileActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class MobileService {
  constructor(
    private readonly repo: MobileRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Appareils
  // ---------------------------------------------------------------------------

  async registerDevice(hotelId: string, input: RegisterDeviceInput, actor: MobileActor): Promise<MobileDevice> {
    this.assertHotel(hotelId, actor);
    const v = validateRegisterDevice(input);
    const device = await this.repo.registerDevice(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "mobile.device.register", entityType: "MobileDevice", entityId: device.id, after: { platform: v.platform } });
    return device;
  }

  async listDevices(hotelId: string, actor: MobileActor): Promise<MobileDevice[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listDevices(hotelId);
  }

  async setDeviceActive(hotelId: string, deviceId: string, isActive: boolean, actor: MobileActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setDeviceActive(hotelId, deviceId, isActive);
  }

  async touchDevice(hotelId: string, installId: string, actor: MobileActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.touchDevice(hotelId, installId);
  }

  // ---------------------------------------------------------------------------
  // Notifications push
  // ---------------------------------------------------------------------------

  async registerPushToken(hotelId: string, input: RegisterPushTokenInput, actor: MobileActor): Promise<PushToken> {
    this.assertHotel(hotelId, actor);
    const v = validateRegisterPushToken(input);
    const token = await this.repo.registerPushToken(hotelId, v);
    return token;
  }

  async listPushTokens(hotelId: string, actor: MobileActor): Promise<PushToken[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listPushTokens(hotelId);
  }

  async revokePushToken(hotelId: string, token: string, actor: MobileActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.revokePushToken(hotelId, token);
  }

  // ---------------------------------------------------------------------------
  // Synchronisation offline
  // ---------------------------------------------------------------------------

  /** Reçoit une opération enregistrée hors-ligne et la pousse vers le serveur. */
  async pushSync(hotelId: string, input: SyncOperation, actor: MobileActor): Promise<MobileSyncLog> {
    this.assertHotel(hotelId, actor);
    const v = validateSyncOperation(input);
    const log = await this.repo.recordSyncOperation(hotelId, v);
    // En production : appliquer l'opération au module concerné + marquer SYNCED.
    await this.repo.markSyncSynced(hotelId, log.id);
    await this.bus.publish({ name: DomainEvents.mobileSynced, hotelId, organisationId: actor.organisationId, data: { entityType: v.entityType, entityId: v.entityId, operation: v.operation } });
    return log;
  }

  async listPendingSync(hotelId: string, actor: MobileActor): Promise<MobileSyncLog[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listPendingSync(hotelId);
  }

  // ---------------------------------------------------------------------------
  // Tableau de bord mobile (par rôle)
  // ---------------------------------------------------------------------------

  async dashboard(hotelId: string, role: "STAFF" | "MANAGER" | "GUEST", actor: MobileActor): Promise<MobileDashboard> {
    this.assertHotel(hotelId, actor);
    const [alerts, tasks, occupancyRate, checkins, checkouts, pending] = await Promise.all([
      this.repo.countAlerts(hotelId),
      this.repo.countPendingTasks(hotelId),
      this.repo.occupancyRate(hotelId),
      this.repo.countCheckinsToday(hotelId),
      this.repo.countCheckoutsToday(hotelId),
      this.repo.countPendingSync(hotelId),
    ]);
    return { role, alerts, tasks, occupancyRate, checkinsToday: checkins, checkoutsToday: checkouts, pendingSync: pending };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertHotel(hotelId: string, actor: MobileActor): void {
    if (actor.hotelId !== hotelId) throw new MobileError("Accès inter-hôtel refusé");
  }
}
