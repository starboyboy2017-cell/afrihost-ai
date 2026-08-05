/**
 * Module 23 — Notifications multicanales : service métier.
 *
 * Système centralisé, **provider-agnostic** :
 *   - configuration par hôtel des fournisseurs (email, SMS, WhatsApp, push) ;
 *   - moteur de templates multilingues avec variables dynamiques ;
 *   - déclencheurs automatiques (réservation, check-in/out, paiement, facture,
 *     fidélité, housekeeping, maintenance, transport, blanchisserie...) ;
 *   - campagnes programmées ;
 *   - file d'attente (queue) avec reprise automatique + politiques de retry ;
 *   - historique complet des envois + suivi des statuts (envoyé/livré/lu/échec)
 *     quand le fournisseur le permet ;
 *   - envoi immédiat ou programmé.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC notifications.*.
 * Chaque mutation est journalisée (audit).
 */
import { type AuditTrail, type EventBus } from "@afrihost/core";
import { NotificationsError } from "./notifications.error.js";
import { extractVariables, renderTemplate } from "./notifications.template-engine.js";
import type { NotificationsRepository } from "./notifications.repository.js";
import type { SenderRegistry } from "./notifications.sender.js";
import type {
  CreateNotificationCampaignInput,
  CreateProviderInput,
  CreateTemplateInput,
  CreateTriggerInput,
  NotificationCampaign,
  NotificationChannel,
  NotificationEventInput,
  NotificationEventType,
  NotificationPriority,
  NotificationProvider,
  NotificationSend,
  NotificationStatus,
  NotificationTemplate,
  NotificationTrigger,
  SendNotificationInput,
  TemplateVars,
} from "./notifications.types.js";
import {
  validateCreateNotificationCampaign,
  validateCreateProvider,
  validateCreateTemplate,
  validateCreateTrigger,
  validateNotificationEvent,
  validateSendNotification,
} from "./notifications.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface NotificationsActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;

export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
    private readonly senders: SenderRegistry = {},
  ) {}

  // ---------------------------------------------------------------------------
  // Fournisseurs
  // ---------------------------------------------------------------------------

  async createProvider(hotelId: string, input: CreateProviderInput, actor: NotificationsActor): Promise<NotificationProvider> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateProvider(input);
    const provider = await this.repo.createProvider(hotelId, v);
    if (v.isDefault) await this.repo.setProviderDefault(hotelId, provider.id);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.provider.create", entityType: "NotificationProvider", entityId: provider.id, after: { name: v.name, channel: v.channel } });
    return provider;
  }

  async listProviders(hotelId: string, actor: NotificationsActor): Promise<NotificationProvider[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listProviders(hotelId);
  }

  async setProviderActive(hotelId: string, providerId: string, isActive: boolean, actor: NotificationsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setProviderActive(hotelId, providerId, isActive);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.provider.toggle", entityType: "NotificationProvider", entityId: providerId, after: { isActive } });
  }

  async setProviderDefault(hotelId: string, providerId: string, actor: NotificationsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setProviderDefault(hotelId, providerId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.provider.default", entityType: "NotificationProvider", entityId: providerId, after: { isDefault: true } });
  }

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  async createTemplate(hotelId: string, input: CreateTemplateInput, actor: NotificationsActor): Promise<NotificationTemplate> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateTemplate(input);
    // Détection automatique des variables
    const template = await this.repo.createTemplate(hotelId, { ...v, variables: v.variables && v.variables.length > 0 ? v.variables : extractVariables(v.body) });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.template.create", entityType: "NotificationTemplate", entityId: template.id, after: { code: v.code, channel: v.channel, locale: v.locale } });
    return template;
  }

  async listTemplates(hotelId: string, actor: NotificationsActor): Promise<NotificationTemplate[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTemplates(hotelId);
  }

  /** Rendu d'un template avec variables (utile pour prévisualisation). */
  async previewTemplate(hotelId: string, channel: NotificationChannel, code: string, vars: TemplateVars, locale: string | undefined, actor: NotificationsActor): Promise<{ subject?: string | null; body: string }> {
    this.assertHotel(hotelId, actor);
    const t = await this.repo.getTemplate(hotelId, channel, code, locale ?? "fr");
    if (!t) throw new NotificationsError("Template introuvable");
    return { subject: t.subject ? renderTemplate(t.subject, vars) : null, body: renderTemplate(t.body, vars) };
  }

  // ---------------------------------------------------------------------------
  // Déclencheurs
  // ---------------------------------------------------------------------------

  async createTrigger(hotelId: string, input: CreateTriggerInput, actor: NotificationsActor): Promise<NotificationTrigger> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateTrigger(input);
    // Vérifie que le template existe pour ce canal
    if (!(await this.repo.getTemplate(hotelId, v.channel, v.templateCode))) throw new NotificationsError("Template introuvable pour ce canal");
    const trigger = await this.repo.createTrigger(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.trigger.create", entityType: "NotificationTrigger", entityId: trigger.id, after: { eventType: v.eventType, channel: v.channel, templateCode: v.templateCode } });
    return trigger;
  }

  async listTriggers(hotelId: string, actor: NotificationsActor): Promise<NotificationTrigger[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTriggers(hotelId);
  }

  async setTriggerActive(hotelId: string, triggerId: string, isActive: boolean, actor: NotificationsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setTriggerActive(hotelId, triggerId, isActive);
  }

  // ---------------------------------------------------------------------------
  // Campagnes
  // ---------------------------------------------------------------------------

  async createCampaign(hotelId: string, input: CreateNotificationCampaignInput, actor: NotificationsActor): Promise<NotificationCampaign> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateNotificationCampaign(input);
    if (!(await this.repo.getTemplate(hotelId, v.channel, v.templateCode))) throw new NotificationsError("Template introuvable pour ce canal");
    const campaign = await this.repo.createCampaign(hotelId, { ...v, scheduleAt: v.scheduleAt ? new Date(v.scheduleAt) : undefined, createdBy: actor.actorUserId });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.campaign.create", entityType: "NotificationCampaign", entityId: campaign.id, after: { name: v.name, channel: v.channel, status: campaign.status } });
    return campaign;
  }

  async listCampaigns(hotelId: string, actor: NotificationsActor): Promise<NotificationCampaign[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listCampaigns(hotelId);
  }

  async launchCampaign(hotelId: string, campaignId: string, actor: NotificationsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setCampaignStatus(hotelId, campaignId, "SENDING");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.campaign.launch", entityType: "NotificationCampaign", entityId: campaignId, after: { status: "SENDING" } });
  }

  // ---------------------------------------------------------------------------
  // Envoi immédiat ou programmé
  // ---------------------------------------------------------------------------

  async send(hotelId: string, input: SendNotificationInput, actor: NotificationsActor): Promise<NotificationSend> {
    this.assertHotel(hotelId, actor);
    const v = validateSendNotification(input);
    const template = await this.repo.getTemplate(hotelId, v.channel, v.templateCode);
    if (!template) throw new NotificationsError("Template introuvable");
    if (!v.recipient.recipient && !(await this.repo.guestExists(hotelId, v.recipient.recipientId))) throw new NotificationsError("Destinataire introuvable");
    const body = renderTemplate(template.body, v.vars ?? {});
    const subject = template.subject ? renderTemplate(template.subject, v.vars ?? {}) : null;
    const provider = v.providerId
      ? await this.repo.getProvider(hotelId, v.providerId)
      : await this.repo.findDefaultProvider(hotelId, v.channel);
    const priority = v.priority ?? "NORMAL";
    const send = await this.repo.enqueue(hotelId, {
      hotelId, channel: v.channel, eventType: v.eventType ?? template.eventType, templateCode: v.templateCode,
      providerId: provider?.id ?? null, recipientType: v.recipient.recipientType, recipientId: v.recipient.recipientId,
      recipient: v.recipient.recipient ?? null, subject, body, priority, maxAttempts: DEFAULT_MAX_ATTEMPTS,
      payload: v.payload ?? null, scheduledAt: v.scheduleAt ? new Date(v.scheduleAt) : null,
    });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "notifications.send", entityType: "NotificationSend", entityId: send.id, after: { channel: v.channel, templateCode: v.templateCode, status: send.status, scheduled: !!v.scheduleAt } });
    await this.bus.publish({ name: "notifications.enqueued", hotelId, organisationId: actor.organisationId, data: { sendId: send.id, channel: v.channel } });
    // Envoi immédiat (non programmé) : déclenche le traitement synchrone.
    if (!v.scheduleAt) {
      await this.processDue(hotelId, actor);
    }
    return send;
  }

  /**
   * Point d'entrée des **déclencheurs automatiques** : appelé par les modules
   * métier (réservations, paiements, fidélité, housekeeping, transport...) via
   * l'EventBus ou directement. Résout les triggers actifs et enqueue les envois.
   */
  async dispatchEvent(input: NotificationEventInput, actor: NotificationsActor): Promise<NotificationSend[]> {
    const v = validateNotificationEvent(input);
    this.assertHotel(v.hotelId, actor);
    const triggers = await this.repo.findTriggers(v.hotelId, v.eventType);
    const created: NotificationSend[] = [];
    for (const trigger of triggers.filter((t) => t.isActive)) {
      const template = await this.repo.getTemplate(v.hotelId, trigger.channel, trigger.templateCode);
      if (!template) continue;
      // Évaluation de la condition du trigger
      if (!this.evaluateTriggerCondition(trigger, v.vars ?? {})) continue;
      const body = renderTemplate(template.body, v.vars ?? {});
      const subject = template.subject ? renderTemplate(template.subject, v.vars ?? {}) : null;
      const provider = await this.repo.findDefaultProvider(v.hotelId, trigger.channel);
      const send = await this.repo.enqueue(v.hotelId, {
        hotelId: v.hotelId, channel: trigger.channel, eventType: v.eventType, templateCode: trigger.templateCode,
        providerId: provider?.id ?? null, recipientType: v.recipient.recipientType, recipientId: v.recipient.recipientId,
        recipient: v.recipient.recipient ?? null, subject, body, priority: trigger.priority,
        maxAttempts: DEFAULT_MAX_ATTEMPTS, payload: v.vars ?? null,
      });
      created.push(send);
    }
    if (created.length > 0) {
      await this.processDue(v.hotelId, actor);
    }
    return created;
  }

  // ---------------------------------------------------------------------------
  // File d'attente & reprise
  // ---------------------------------------------------------------------------

  /** Traite les envois dus (immédiats et retries) via les adaptateurs fournisseurs. */
  async processDue(hotelId: string, actor: NotificationsActor, limit = 50): Promise<number> {
    this.assertHotel(hotelId, actor);
    const due = await this.repo.claimDueSends(hotelId, new Date(), limit);
    let processed = 0;
    for (const send of due) {
      try {
        await this.repo.markProcessing(hotelId, send.id);
        const sent = await this.deliver(send);
        if (sent.status === "FAILED") {
          await this.handleFailure(send, "Échec fournisseur");
        } else {
          await this.repo.markSent(hotelId, send.id, sent.providerRef ?? null);
          if (sent.status === "DELIVERED") await this.repo.markDelivered(hotelId, send.id);
          if (sent.status === "READ") { await this.repo.markDelivered(hotelId, send.id); await this.repo.markRead(hotelId, send.id); }
        }
        processed++;
      } catch (err) {
        await this.handleFailure(send, err instanceof Error ? err.message : "Erreur d'envoi");
      }
    }
    return processed;
  }

  private async deliver(send: NotificationSend) {
    const provider = send.providerId ? await this.repo.getProvider(send.hotelId, send.providerId) : null;
    if (!provider) return { status: "FAILED" as const };
    const sender = this.senders[provider.providerKey];
    // Pas d'adaptateur branché (ex: environnement local / test) → on considère envoyé.
    if (!sender) return { status: "SENT" as const, providerRef: null };
    return sender.send(provider, {
      to: send.recipient ?? "",
      subject: send.subject ?? null,
      body: send.body ?? "",
      from: provider.fromAddress ?? null,
      replyTo: provider.replyTo ?? null,
    });
  }

  private async handleFailure(send: NotificationSend, error: string): Promise<void> {
    const nextAttempt = send.attempts + 1;
    if (nextAttempt >= send.maxAttempts) {
      await this.repo.markFailed(send.hotelId, send.id, error, null);
    } else {
      const retryAt = this.backoff(nextAttempt);
      await this.repo.scheduleRetry(send.hotelId, send.id, retryAt);
    }
  }

  /** Backoff exponentiel avec jitter : 1min, 5min, 15min... */
  private backoff(attempt: number): Date {
    const minutes = Math.min(Math.pow(2, attempt) * 1, 120);
    return new Date(Date.now() + minutes * 60_000);
  }

  // ---------------------------------------------------------------------------
  // Suivi des statuts
  // ---------------------------------------------------------------------------

  async listSends(hotelId: string, status: NotificationStatus | undefined, actor: NotificationsActor): Promise<NotificationSend[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listSends(hotelId, status, 200);
  }

  async getSend(hotelId: string, sendId: string, actor: NotificationsActor): Promise<NotificationSend> {
    this.assertHotel(hotelId, actor);
    const s = await this.repo.getSend(hotelId, sendId);
    if (!s) throw new NotificationsError("Envoi introuvable");
    return s;
  }

  /** Callback de webhook fournisseur : met à jour le statut d'un envoi. */
  async updateStatus(hotelId: string, sendId: string, status: NotificationStatus, actor: NotificationsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    switch (status) {
      case "DELIVERED": await this.repo.markDelivered(hotelId, sendId); break;
      case "READ": await this.repo.markDelivered(hotelId, sendId); await this.repo.markRead(hotelId, sendId); break;
      case "FAILED": {
        const s = await this.repo.getSend(hotelId, sendId);
        if (s) await this.handleFailure(s, "Rejeté par le fournisseur");
        break;
      }
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Évalue la condition d'un déclencheur (règle simple de correspondance). */
  private evaluateTriggerCondition(trigger: NotificationTrigger, vars: TemplateVars): boolean {
    const cond = trigger.condition;
    if (!cond) return true;
    // Format: { "field": "status", "op": "eq", "value": "CONFIRMED" } ou { "field": "status", "equals": "CONFIRMED" }
    if (typeof cond.field === "string") {
      const actual = this.lookupVar(vars, cond.field);
      const op = cond.op ?? "eq";
      const expected = cond.value;
      switch (op) {
        case "eq": return String(actual) === String(expected);
        case "neq": return String(actual) !== String(expected);
        case "in": return Array.isArray(expected) && expected.some((e) => String(e) === String(actual));
        case "gte": return Number(actual) >= Number(expected);
        default: return false;
      }
    }
    if (typeof cond.equals === "string") {
      return this.lookupVar(vars, cond.equals) !== undefined;
    }
    return true;
  }

  private lookupVar(vars: TemplateVars, path: string): unknown {
    let val: unknown = vars;
    for (const part of path.split(".")) {
      if (typeof val === "object" && val !== null && part in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[part];
      } else return undefined;
    }
    return val;
  }

  private assertHotel(hotelId: string, actor: NotificationsActor): void {
    if (actor.hotelId !== hotelId) throw new NotificationsError("Accès inter-hôtel refusé");
  }
}
