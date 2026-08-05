/**
 * Module 23 — Notifications multicanales : adapter Prisma.
 */
import type {
  NotificationsRepository,
  EnqueueInput,
  CreateNotificationCampaignInput,
  CreateProviderInput,
  CreateTemplateInput,
  CreateTriggerInput,
  NotificationCampaign,
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
  NotificationProvider,
  NotificationSend,
  NotificationStatus,
  NotificationTemplate,
  NotificationTrigger,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue | undefined => v as Prisma.InputJsonValue;

function mapProvider(p: {
  id: string; hotelId: string; name: string; channel: string; providerType: string; providerKey: string;
  credentials: unknown; config: unknown; fromAddress: string | null; domain: string | null; replyTo: string | null;
  isDefault: boolean; isActive: boolean; rateLimitPerMinute: number;
}): NotificationProvider {
  return { id: p.id, hotelId: p.hotelId, name: p.name, channel: p.channel as NotificationChannel, providerType: p.providerType as NotificationProvider["providerType"], providerKey: p.providerKey, credentials: p.credentials as Record<string, unknown> | null, config: p.config as Record<string, unknown> | null, fromAddress: p.fromAddress, domain: p.domain, replyTo: p.replyTo, isDefault: p.isDefault, isActive: p.isActive, rateLimitPerMinute: p.rateLimitPerMinute };
}

function mapTemplate(t: {
  id: string; hotelId: string; channel: string; eventType: string; code: string; locale: string;
  subject: string | null; body: string; variables: string[]; isActive: boolean;
}): NotificationTemplate {
  return { id: t.id, hotelId: t.hotelId, channel: t.channel as NotificationChannel, eventType: t.eventType as NotificationEventType, code: t.code, locale: t.locale, subject: t.subject, body: t.body, variables: t.variables, isActive: t.isActive };
}

function mapTrigger(t: {
  id: string; hotelId: string; eventType: string; channel: string; templateCode: string; condition: unknown;
  priority: string; isActive: boolean;
}): NotificationTrigger {
  return { id: t.id, hotelId: t.hotelId, eventType: t.eventType as NotificationEventType, channel: t.channel as NotificationChannel, templateCode: t.templateCode, condition: t.condition as Record<string, unknown> | null, priority: t.priority as NotificationPriority, isActive: t.isActive };
}

function mapCampaign(c: {
  id: string; hotelId: string; name: string; channel: string; templateCode: string; segmentId: string | null;
  audience: unknown; scheduleAt: Date | null; status: string; sentAt: Date | null; config: unknown; createdBy: string | null;
}): NotificationCampaign {
  return { id: c.id, hotelId: c.hotelId, name: c.name, channel: c.channel as NotificationChannel, templateCode: c.templateCode, segmentId: c.segmentId, audience: c.audience as Record<string, unknown> | null, scheduleAt: c.scheduleAt, status: c.status, sentAt: c.sentAt, config: c.config as Record<string, unknown> | null, createdBy: c.createdBy };
}

function mapSend(s: {
  id: string; hotelId: string; notificationId: string | null; campaignId: string | null; channel: string;
  eventType: string | null; templateCode: string | null; providerId: string | null; recipientType: string;
  recipientId: string; recipient: string | null; subject: string | null; body: string | null; status: string;
  priority: string; attempts: number; maxAttempts: number; nextRetryAt: Date | null; providerRef: string | null;
  error: string | null; payload: unknown; scheduledAt: Date | null; sentAt: Date | null; deliveredAt: Date | null; readAt: Date | null;
}): NotificationSend {
  return { id: s.id, hotelId: s.hotelId, notificationId: s.notificationId, campaignId: s.campaignId, channel: s.channel as NotificationChannel, eventType: s.eventType as NotificationEventType | null, templateCode: s.templateCode, providerId: s.providerId, recipientType: s.recipientType, recipientId: s.recipientId, recipient: s.recipient, subject: s.subject, body: s.body, status: s.status as NotificationStatus, priority: s.priority as NotificationPriority, attempts: s.attempts, maxAttempts: s.maxAttempts, nextRetryAt: s.nextRetryAt, providerRef: s.providerRef, error: s.error, payload: s.payload as Record<string, unknown> | null, scheduledAt: s.scheduledAt, sentAt: s.sentAt, deliveredAt: s.deliveredAt, readAt: s.readAt };
}

export class PrismaNotificationsRepository implements NotificationsRepository {
  // Providers
  async createProvider(hotelId: string, input: CreateProviderInput): Promise<NotificationProvider> {
    const p = await prisma.notificationProvider.create({ data: {
      hotelId, name: input.name, channel: input.channel, providerType: input.providerType, providerKey: input.providerKey,
      credentials: input.credentials ? json(input.credentials) : undefined, config: input.config ? json(input.config) : undefined,
      fromAddress: input.fromAddress ?? null, domain: input.domain ?? null, replyTo: input.replyTo ?? null,
      isDefault: input.isDefault ?? false, rateLimitPerMinute: input.rateLimitPerMinute ?? 0,
    } });
    return mapProvider(p);
  }
  async listProviders(hotelId: string): Promise<NotificationProvider[]> {
    const rows = await prisma.notificationProvider.findMany({ where: { hotelId }, orderBy: [{ channel: "asc" }, { name: "asc" }] });
    return rows.map(mapProvider);
  }
  async getProvider(hotelId: string, providerId: string): Promise<NotificationProvider | null> {
    const p = await prisma.notificationProvider.findFirst({ where: { id: providerId, hotelId } });
    return p ? mapProvider(p) : null;
  }
  async findDefaultProvider(hotelId: string, channel: NotificationChannel): Promise<NotificationProvider | null> {
    const p = await prisma.notificationProvider.findFirst({ where: { hotelId, channel, isActive: true, isDefault: true } });
    if (p) return mapProvider(p);
    const anyActive = await prisma.notificationProvider.findFirst({ where: { hotelId, channel, isActive: true } });
    return anyActive ? mapProvider(anyActive) : null;
  }
  async setProviderActive(hotelId: string, providerId: string, isActive: boolean): Promise<void> {
    await prisma.notificationProvider.update({ where: { id: providerId, hotelId }, data: { isActive } });
  }
  async setProviderDefault(hotelId: string, providerId: string): Promise<void> {
    await prisma.$transaction([
      prisma.notificationProvider.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      prisma.notificationProvider.update({ where: { id: providerId }, data: { isDefault: true } }),
    ]);
  }

  // Templates
  async createTemplate(hotelId: string, input: CreateTemplateInput): Promise<NotificationTemplate> {
    const t = await prisma.notificationTemplate.create({ data: { hotelId, channel: input.channel, eventType: input.eventType, code: input.code, locale: input.locale ?? "fr", subject: input.subject ?? null, body: input.body, variables: input.variables ?? [] } });
    return mapTemplate(t);
  }
  async listTemplates(hotelId: string): Promise<NotificationTemplate[]> {
    const rows = await prisma.notificationTemplate.findMany({ where: { hotelId }, orderBy: [{ channel: "asc" }, { code: "asc" }] });
    return rows.map(mapTemplate);
  }
  async getTemplate(hotelId: string, channel: NotificationChannel, code: string, locale = "fr"): Promise<NotificationTemplate | null> {
    const t = await prisma.notificationTemplate.findUnique({ where: { hotelId_channel_code_locale: { hotelId, channel, code, locale } } });
    return t ? mapTemplate(t) : null;
  }

  // Triggers
  async createTrigger(hotelId: string, input: CreateTriggerInput): Promise<NotificationTrigger> {
    const t = await prisma.notificationTrigger.create({ data: { hotelId, eventType: input.eventType, channel: input.channel, templateCode: input.templateCode, condition: input.condition ? json(input.condition) : undefined, priority: input.priority ?? "NORMAL" } });
    return mapTrigger(t);
  }
  async listTriggers(hotelId: string): Promise<NotificationTrigger[]> {
    const rows = await prisma.notificationTrigger.findMany({ where: { hotelId }, orderBy: { eventType: "asc" } });
    return rows.map(mapTrigger);
  }
  async setTriggerActive(hotelId: string, triggerId: string, isActive: boolean): Promise<void> {
    await prisma.notificationTrigger.update({ where: { id: triggerId }, data: { isActive } });
  }
  async findTriggers(hotelId: string, eventType: NotificationEventType): Promise<NotificationTrigger[]> {
    const rows = await prisma.notificationTrigger.findMany({ where: { hotelId, eventType } });
    return rows.map(mapTrigger);
  }

  // Campaigns
  async createCampaign(hotelId: string, input: CreateNotificationCampaignInput & { createdBy?: string }): Promise<NotificationCampaign> {
    const c = await prisma.notificationCampaign.create({ data: {
      hotelId, name: input.name, channel: input.channel, templateCode: input.templateCode, segmentId: input.segmentId ?? null,
      audience: input.audience ? json(input.audience) : undefined, scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : null,
      status: input.scheduleAt ? "SCHEDULED" : "DRAFT", config: input.config ? json(input.config) : undefined, createdBy: input.createdBy ?? null,
    } });
    return mapCampaign(c);
  }
  async listCampaigns(hotelId: string): Promise<NotificationCampaign[]> {
    const rows = await prisma.notificationCampaign.findMany({ where: { hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map(mapCampaign);
  }
  async getCampaign(hotelId: string, campaignId: string): Promise<NotificationCampaign | null> {
    const c = await prisma.notificationCampaign.findFirst({ where: { id: campaignId, hotelId } });
    return c ? mapCampaign(c) : null;
  }
  async setCampaignStatus(hotelId: string, campaignId: string, status: string): Promise<void> {
    await prisma.notificationCampaign.update({ where: { id: campaignId }, data: { status, ...(status === "SENT" ? { sentAt: new Date() } : {}) } });
  }

  // Sends / queue
  async enqueue(hotelId: string, input: EnqueueInput): Promise<NotificationSend> {
    const s = await prisma.notificationSend.create({ data: {
      hotelId, notificationId: input.notificationId ?? null, campaignId: input.campaignId ?? null,
      channel: input.channel, eventType: input.eventType ?? null, templateCode: input.templateCode ?? null,
      providerId: input.providerId ?? null, recipientType: input.recipientType, recipientId: input.recipientId,
      recipient: input.recipient ?? null, subject: input.subject ?? null, body: input.body ?? null,
      priority: input.priority, maxAttempts: input.maxAttempts ?? 3, payload: input.payload ? json(input.payload) : undefined,
      scheduledAt: input.scheduledAt ?? null,
    } });
    return mapSend(s);
  }
  async listSends(hotelId: string, status?: NotificationStatus, limit = 200): Promise<NotificationSend[]> {
    const rows = await prisma.notificationSend.findMany({ where: { hotelId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map(mapSend);
  }
  async getSend(hotelId: string, sendId: string): Promise<NotificationSend | null> {
    const s = await prisma.notificationSend.findFirst({ where: { id: sendId, hotelId } });
    return s ? mapSend(s) : null;
  }
  async claimDueSends(hotelId: string, now: Date, limit = 50): Promise<NotificationSend[]> {
    const rows = await prisma.notificationSend.findMany({
      where: { hotelId, status: "QUEUED", OR: [{ scheduledAt: { lte: now } }, { scheduledAt: null }] },
      orderBy: { createdAt: "asc" }, take: limit,
    });
    return rows.map(mapSend);
  }
  async markProcessing(hotelId: string, sendId: string): Promise<void> {
    await prisma.notificationSend.updateMany({ where: { id: sendId, hotelId }, data: { status: "PROCESSING", attempts: { increment: 1 } } });
  }
  async markSent(hotelId: string, sendId: string, providerRef?: string | null): Promise<void> {
    await prisma.notificationSend.updateMany({ where: { id: sendId, hotelId }, data: { status: "SENT", sentAt: new Date(), providerRef: providerRef ?? null } });
  }
  async markDelivered(hotelId: string, sendId: string): Promise<void> {
    await prisma.notificationSend.updateMany({ where: { id: sendId, hotelId }, data: { status: "DELIVERED", deliveredAt: new Date() } });
  }
  async markRead(hotelId: string, sendId: string): Promise<void> {
    await prisma.notificationSend.updateMany({ where: { id: sendId, hotelId }, data: { status: "READ", readAt: new Date() } });
  }
  async markFailed(hotelId: string, sendId: string, error: string, retryAt?: Date | null): Promise<void> {
    await prisma.notificationSend.updateMany({ where: { id: sendId, hotelId }, data: { status: "FAILED", error } });
  }
  async scheduleRetry(hotelId: string, sendId: string, retryAt: Date): Promise<void> {
    await prisma.notificationSend.updateMany({ where: { id: sendId, hotelId }, data: { status: "QUEUED", nextRetryAt: retryAt } });
  }

  // Compat Notification table
  async createNotification(hotelId: string, input: { recipientType: string; recipientId: string; channel: NotificationChannel; templateCode: string; payload?: Record<string, unknown> | null }): Promise<{ id: string }> {
    const n = await prisma.notification.create({ data: { hotelId, recipientType: input.recipientType, recipientId: input.recipientId, channel: input.channel, templateCode: input.templateCode, payload: input.payload ? json(input.payload) : undefined } });
    return { id: n.id };
  }

  async guestExists(hotelId: string, guestId: string): Promise<boolean> {
    const g = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return g !== null;
  }
}
