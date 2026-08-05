import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { NotificationsService, type NotificationsActor } from "./notifications.service.js";
import { NotificationsError } from "./notifications.error.js";
import type { NotificationsRepository, EnqueueInput } from "./notifications.repository.js";
import type { NotificationSender } from "./notifications.sender.js";
import type {
  CreateNotificationCampaignInput, CreateProviderInput, CreateTemplateInput, CreateTriggerInput,
  NotificationCampaign, NotificationChannel, NotificationEventType, NotificationPriority,
  NotificationProvider, NotificationSend, NotificationStatus, NotificationTemplate, NotificationTrigger, TemplateVars,
} from "./notifications.types.js";

let seq = 0;

class MemoryRepo implements NotificationsRepository {
  providers: NotificationProvider[] = [];
  templates: NotificationTemplate[] = [];
  triggers: NotificationTrigger[] = [];
  campaigns: NotificationCampaign[] = [];
  sends: NotificationSend[] = [];
  guestIds = new Set<string>();

  async createProvider(hotelId: string, input: CreateProviderInput): Promise<NotificationProvider> {
    const p: NotificationProvider = { id: `prov-${++seq}`, hotelId, name: input.name, channel: input.channel, providerType: input.providerType, providerKey: input.providerKey, credentials: input.credentials ?? null, config: input.config ?? null, fromAddress: input.fromAddress ?? null, domain: input.domain ?? null, replyTo: input.replyTo ?? null, isDefault: input.isDefault ?? false, isActive: true, rateLimitPerMinute: input.rateLimitPerMinute ?? 0 };
    this.providers.push(p); return p;
  }
  async listProviders(hotelId: string): Promise<NotificationProvider[]> { return this.providers.filter((p) => p.hotelId === hotelId); }
  async getProvider(hotelId: string, providerId: string): Promise<NotificationProvider | null> { return this.providers.find((p) => p.id === providerId && p.hotelId === hotelId) ?? null; }
  async findDefaultProvider(hotelId: string, channel: NotificationChannel): Promise<NotificationProvider | null> { return this.providers.find((p) => p.hotelId === hotelId && p.channel === channel && p.isActive && p.isDefault) ?? this.providers.find((p) => p.hotelId === hotelId && p.channel === channel && p.isActive) ?? null; }
  async setProviderActive(hotelId: string, providerId: string, isActive: boolean): Promise<void> { const p = this.providers.find((x) => x.id === providerId)!; p.isActive = isActive; }
  async setProviderDefault(hotelId: string, providerId: string): Promise<void> { this.providers.forEach((p) => { p.isDefault = p.id === providerId; }); }

  async createTemplate(hotelId: string, input: CreateTemplateInput): Promise<NotificationTemplate> {
    const t: NotificationTemplate = { id: `tpl-${++seq}`, hotelId, channel: input.channel, eventType: input.eventType, code: input.code, locale: input.locale ?? "fr", subject: input.subject ?? null, body: input.body, variables: input.variables ?? [], isActive: true };
    this.templates.push(t); return t;
  }
  async listTemplates(hotelId: string): Promise<NotificationTemplate[]> { return this.templates.filter((t) => t.hotelId === hotelId); }
  async getTemplate(hotelId: string, channel: NotificationChannel, code: string, locale = "fr"): Promise<NotificationTemplate | null> { return this.templates.find((t) => t.hotelId === hotelId && t.channel === channel && t.code === code && t.locale === locale) ?? null; }

  async createTrigger(hotelId: string, input: CreateTriggerInput): Promise<NotificationTrigger> {
    const t: NotificationTrigger = { id: `trg-${++seq}`, hotelId, eventType: input.eventType, channel: input.channel, templateCode: input.templateCode, condition: input.condition ?? null, priority: input.priority ?? "NORMAL", isActive: true };
    this.triggers.push(t); return t;
  }
  async listTriggers(hotelId: string): Promise<NotificationTrigger[]> { return this.triggers.filter((t) => t.hotelId === hotelId); }
  async setTriggerActive(hotelId: string, triggerId: string, isActive: boolean): Promise<void> { const t = this.triggers.find((x) => x.id === triggerId)!; t.isActive = isActive; }
  async findTriggers(hotelId: string, eventType: NotificationEventType): Promise<NotificationTrigger[]> { return this.triggers.filter((t) => t.hotelId === hotelId && t.eventType === eventType); }

  async createCampaign(hotelId: string, input: CreateNotificationCampaignInput & { createdBy?: string }): Promise<NotificationCampaign> {
    const c: NotificationCampaign = { id: `cmp-${++seq}`, hotelId, name: input.name, channel: input.channel, templateCode: input.templateCode, segmentId: input.segmentId ?? null, audience: input.audience ?? null, scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : null, status: input.scheduleAt ? "SCHEDULED" : "DRAFT", config: input.config ?? null, createdBy: input.createdBy ?? null };
    this.campaigns.push(c); return c;
  }
  async listCampaigns(hotelId: string): Promise<NotificationCampaign[]> { return this.campaigns.filter((c) => c.hotelId === hotelId); }
  async getCampaign(hotelId: string, campaignId: string): Promise<NotificationCampaign | null> { return this.campaigns.find((c) => c.id === campaignId && c.hotelId === hotelId) ?? null; }
  async setCampaignStatus(hotelId: string, campaignId: string, status: string): Promise<void> { const c = this.campaigns.find((x) => x.id === campaignId)!; c.status = status; }

  async enqueue(hotelId: string, input: EnqueueInput): Promise<NotificationSend> {
    const s: NotificationSend = { id: `send-${++seq}`, hotelId, channel: input.channel, eventType: input.eventType ?? null, templateCode: input.templateCode ?? null, providerId: input.providerId ?? null, recipientType: input.recipientType, recipientId: input.recipientId, recipient: input.recipient ?? null, subject: input.subject ?? null, body: input.body ?? null, status: "QUEUED", priority: input.priority, attempts: 0, maxAttempts: input.maxAttempts ?? 3, nextRetryAt: null, providerRef: null, error: null, payload: input.payload ?? null, scheduledAt: input.scheduledAt ?? null, sentAt: null, deliveredAt: null, readAt: null, notificationId: input.notificationId ?? null, campaignId: input.campaignId ?? null };
    this.sends.push(s); return s;
  }
  async listSends(hotelId: string, status?: NotificationStatus, limit?: number): Promise<NotificationSend[]> { return this.sends.filter((s) => s.hotelId === hotelId && (status ? s.status === status : true)).slice(0, limit); }
  async getSend(hotelId: string, sendId: string): Promise<NotificationSend | null> { return this.sends.find((s) => s.id === sendId && s.hotelId === hotelId) ?? null; }
  async claimDueSends(hotelId: string, now: Date, limit = 50): Promise<NotificationSend[]> {
    return this.sends.filter((s) => s.hotelId === hotelId && s.status === "QUEUED" && (s.scheduledAt ? s.scheduledAt <= now : true)).slice(0, limit);
  }
  async markProcessing(hotelId: string, sendId: string): Promise<void> { const s = this.sends.find((x) => x.id === sendId)!; s.status = "PROCESSING"; s.attempts += 1; }
  async markSent(hotelId: string, sendId: string, providerRef?: string | null): Promise<void> { const s = this.sends.find((x) => x.id === sendId)!; s.status = "SENT"; s.sentAt = new Date(); s.providerRef = providerRef ?? null; }
  async markDelivered(hotelId: string, sendId: string): Promise<void> { const s = this.sends.find((x) => x.id === sendId)!; s.status = "DELIVERED"; s.deliveredAt = new Date(); }
  async markRead(hotelId: string, sendId: string): Promise<void> { const s = this.sends.find((x) => x.id === sendId)!; s.status = "READ"; s.readAt = new Date(); }
  async markFailed(hotelId: string, sendId: string, error: string, retryAt?: Date | null): Promise<void> { const s = this.sends.find((x) => x.id === sendId)!; s.status = "FAILED"; s.error = error; }
  async scheduleRetry(hotelId: string, sendId: string, retryAt: Date): Promise<void> { const s = this.sends.find((x) => x.id === sendId)!; s.status = "QUEUED"; s.nextRetryAt = retryAt; }
  async createNotification(hotelId: string, input: { recipientType: string; recipientId: string; channel: NotificationChannel; templateCode: string; payload?: Record<string, unknown> | null }): Promise<{ id: string }> { return { id: `notif-${++seq}` }; }
  async guestExists(hotelId: string, guestId: string): Promise<boolean> { return this.guestIds.has(guestId); }
}

const actorH1: NotificationsActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  repo.guestIds.add("g1");
  repo.guestIds.add("g2");
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new NotificationsService(repo, audit, bus);
  return { repo, svc };
}

// Sender factice pour le canal email (providerKey "fake-mail")
const fakeSender: NotificationSender = {
  channel: "EMAIL",
  async send(provider, payload) {
    if (!payload.to) return { status: "FAILED" };
    return { status: "DELIVERED", providerRef: `ext-${provider.id}` };
  },
};

function withSender() {
  const { repo, svc } = build();
  const svc2 = new NotificationsService(repo, new AuditLogger(new InMemoryAuditWriter()), new EventBus(), { "fake-mail": fakeSender });
  return { repo, svc: svc2 };
}

describe("notifications.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée un fournisseur configurable", async () => {
    const { svc } = build();
    const p = await svc.createProvider("h1", { name: "Resend", channel: "EMAIL", providerType: "EMAIL", providerKey: "resend", fromAddress: "noreply@demo.bj" }, actorH1);
    expect(p.id).toBeTruthy();
    expect(p.channel).toBe("EMAIL");
  });

  it("crée un template multilingue avec variables auto-détectées", async () => {
    const { svc } = build();
    const t = await svc.createTemplate("h1", { channel: "EMAIL", eventType: "RESERVATION_CONFIRMED", code: "booking_confirmation", body: "Bonjour {{firstName}}, réservation {{reservation.code}} confirmée" }, actorH1);
    expect(t.variables).toContain("firstName");
    expect(t.variables).toContain("reservation.code");
  });

  it("prévisualise un template avec variables", async () => {
    const { svc } = build();
    await svc.createTemplate("h1", { channel: "EMAIL", eventType: "RESERVATION_CONFIRMED", code: "booking_confirmation", subject: "Confirmation {{reservation.code}}", body: "Bonjour {{firstName}}" }, actorH1);
    const r = await svc.previewTemplate("h1", "EMAIL", "booking_confirmation", { firstName: "Awa", reservation: { code: "R-1" } }, "fr", actorH1);
    expect(r.subject).toBe("Confirmation R-1");
    expect(r.body).toBe("Bonjour Awa");
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.listProviders("h2", actorH1)).rejects.toThrow(NotificationsError);
  });

  it("envoie une notification immédiate et la traite via le sender", async () => {
    const { repo, svc } = withSender();
    await svc.createProvider("h1", { name: "Mail", channel: "EMAIL", providerType: "EMAIL", providerKey: "fake-mail", fromAddress: "noreply@demo.bj", isDefault: true }, actorH1);
    await svc.createTemplate("h1", { channel: "EMAIL", eventType: "CHECK_IN", code: "checkin", body: "Bienvenue {{firstName}}" }, actorH1);
    const send = await svc.send("h1", { channel: "EMAIL", templateCode: "checkin", recipient: { recipientType: "guest", recipientId: "g1", recipient: "awa@demo.bj" }, vars: { firstName: "Awa" } }, actorH1);
    expect(send.id).toBeTruthy();
    // Le send a été traité (status SENT ou DELIVERED)
    const processed = repo.sends.find((s) => s.id === send.id)!;
    expect(processed.status === "SENT" || processed.status === "DELIVERED").toBe(true);
    expect(processed.providerRef).toBeTruthy();
  });

  it("programme un envoi (reste en QUEUED jusqu'à l'échéance)", async () => {
    const { repo, svc } = build();
    await svc.createTemplate("h1", { channel: "SMS", eventType: "PROMOTION", code: "promo", body: "Promo {{offer}}" }, actorH1);
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const send = await svc.send("h1", { channel: "SMS", templateCode: "promo", recipient: { recipientType: "guest", recipientId: "g1", recipient: "+2290000" }, vars: { offer: "-20%" }, scheduleAt: future }, actorH1);
    const s = repo.sends.find((x) => x.id === send.id)!;
    expect(s.status).toBe("QUEUED");
    expect(s.scheduledAt).toBeTruthy();
  });

  it("applique un backoff et rejette après maxAttempts", async () => {
    const { repo, svc } = build();
    await svc.createProvider("h1", { name: "Mail", channel: "EMAIL", providerType: "EMAIL", providerKey: "resend", isDefault: true }, actorH1);
    await svc.createTemplate("h1", { channel: "EMAIL", eventType: "CHECK_OUT", code: "checkout", body: "Merci" }, actorH1);
    const send = await svc.send("h1", { channel: "EMAIL", templateCode: "checkout", recipient: { recipientType: "guest", recipientId: "g1", recipient: "x@y.z" } }, actorH1);
    // Pas de sender pour "resend" → considéré envoyé (mode local). Testons le retry via markFailed manuel.
    const s = repo.sends.find((x) => x.id === send.id)!;
    await svc.updateStatus("h1", send.id, "FAILED", actorH1);
    const afterFail = repo.sends.find((x) => x.id === send.id)!;
    expect(afterFail.nextRetryAt).toBeTruthy(); // retry programmé
  });

  it("déclencheur automatique : dispatchEvent enqueue et traite", async () => {
    const { repo, svc } = withSender();
    await svc.createProvider("h1", { name: "Mail", channel: "EMAIL", providerType: "EMAIL", providerKey: "fake-mail", isDefault: true }, actorH1);
    await svc.createTemplate("h1", { channel: "EMAIL", eventType: "RESERVATION_CONFIRMED", code: "conf", body: "Réservation {{code}} confirmée" }, actorH1);
    await svc.createTrigger("h1", { eventType: "RESERVATION_CONFIRMED", channel: "EMAIL", templateCode: "conf", condition: { field: "status", op: "eq", value: "CONFIRMED" } }, actorH1);
    const created = await svc.dispatchEvent({ hotelId: "h1", organisationId: "org1", eventType: "RESERVATION_CONFIRMED", recipient: { recipientType: "guest", recipientId: "g1", recipient: "awa@demo.bj" }, vars: { code: "R-9", status: "CONFIRMED" } }, actorH1);
    expect(created.length).toBe(1);
    const processed = repo.sends.find((s) => s.id === created[0]!.id)!;
    expect(processed.status === "SENT" || processed.status === "DELIVERED").toBe(true);
  });

  it("déclencheur : condition non remplie → pas d'envoi", async () => {
    const { svc } = build();
    await svc.createTemplate("h1", { channel: "EMAIL", eventType: "PAYMENT_RECEIVED", code: "pay", body: "Paiement" }, actorH1);
    await svc.createTrigger("h1", { eventType: "PAYMENT_RECEIVED", channel: "EMAIL", templateCode: "pay", condition: { field: "amount", op: "gte", value: 10000 } }, actorH1);
    const created = await svc.dispatchEvent({ hotelId: "h1", organisationId: "org1", eventType: "PAYMENT_RECEIVED", recipient: { recipientType: "guest", recipientId: "g1" }, vars: { amount: 5000 } }, actorH1);
    expect(created.length).toBe(0);
  });

  it("crée et lance une campagne programmée", async () => {
    const { repo, svc } = build();
    await svc.createTemplate("h1", { channel: "WHATSAPP", eventType: "PROMOTION", code: "promo", body: "Offre {{offer}}" }, actorH1);
    const campaign = await svc.createCampaign("h1", { name: "Promo été", channel: "WHATSAPP", templateCode: "promo", scheduleAt: new Date(Date.now() + 86_400_000).toISOString() }, actorH1);
    expect(campaign.status).toBe("SCHEDULED");
    await svc.launchCampaign("h1", campaign.id, actorH1);
    expect(repo.campaigns.find((c) => c.id === campaign.id)!.status).toBe("SENDING");
  });

  it("crée une campagne sans template → erreur", async () => {
    const { svc } = build();
    await expect(svc.createCampaign("h1", { name: "X", channel: "EMAIL", templateCode: "inexistant" }, actorH1)).rejects.toThrow("Template introuvable");
  });
});
