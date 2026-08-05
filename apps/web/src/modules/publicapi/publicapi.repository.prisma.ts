/**
 * Module 30 — API Publique & Marketplace : adapter Prisma.
 */
import type {
  PublicApiRepository,
  ApiAccessLog, ApiApp, ApiCredential, ApiMarketplaceApp, ApiWebhook, ApiWebhookDelivery,
  CreateApiAppInput, CreateCredentialInput, PublishMarketplaceInput, RegisterWebhookInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

export class PrismaPublicApiRepository implements PublicApiRepository {
  async createApp(input: CreateApiAppInput & { ownerOrgId?: string | null; ownerUserId?: string | null }): Promise<ApiApp> {
    const a = await prisma.apiApp.create({ data: { name: input.name, description: input.description ?? null, ownerOrgId: input.ownerOrgId ?? null, ownerUserId: input.ownerUserId ?? null, environment: input.environment ?? "SANDBOX" } });
    return { id: a.id, name: a.name, description: a.description, ownerOrgId: a.ownerOrgId, ownerUserId: a.ownerUserId, environment: a.environment, isActive: a.isActive };
  }
  async listApps(ownerOrgId: string): Promise<ApiApp[]> {
    const rows = await prisma.apiApp.findMany({ where: { ownerOrgId } });
    return rows.map((a) => ({ id: a.id, name: a.name, description: a.description, ownerOrgId: a.ownerOrgId, ownerUserId: a.ownerUserId, environment: a.environment, isActive: a.isActive }));
  }
  async getApp(appId: string): Promise<ApiApp | null> {
    const a = await prisma.apiApp.findUnique({ where: { id: appId } });
    return a ? { id: a.id, name: a.name, description: a.description, ownerOrgId: a.ownerOrgId, ownerUserId: a.ownerUserId, environment: a.environment, isActive: a.isActive } : null;
  }

  async createCredential(appId: string, input: CreateCredentialInput & { clientId: string; secretHash: string }): Promise<ApiCredential> {
    const c = await prisma.apiCredential.create({ data: { appId, kind: input.kind ?? "API_KEY", clientId: input.clientId, secretHash: input.secretHash, scopes: input.scopes ?? [], hotels: input.hotels ?? [], environment: "SANDBOX", rateLimitPerMinute: input.rateLimitPerMinute ?? 60 } });
    return { id: c.id, appId: c.appId, kind: c.kind, clientId: c.clientId, scopes: c.scopes, hotels: c.hotels, environment: c.environment, rateLimitPerMinute: c.rateLimitPerMinute, isActive: c.isActive, expiresAt: c.expiresAt, secretHash: c.secretHash };
  }
  async listCredentials(appId: string): Promise<ApiCredential[]> {
    const rows = await prisma.apiCredential.findMany({ where: { appId } });
    return rows.map((c) => ({ id: c.id, appId: c.appId, kind: c.kind, clientId: c.clientId, scopes: c.scopes, hotels: c.hotels, environment: c.environment, rateLimitPerMinute: c.rateLimitPerMinute, isActive: c.isActive, expiresAt: c.expiresAt }));
  }
  async revokeCredential(credentialId: string): Promise<void> {
    await prisma.apiCredential.update({ where: { id: credentialId }, data: { isActive: false } });
  }
  async authenticate(clientId: string, secretHash: string): Promise<ApiCredential | null> {
    const c = await prisma.apiCredential.findUnique({ where: { clientId } });
    if (!c || c.secretHash !== secretHash) return null;
    return { id: c.id, appId: c.appId, kind: c.kind, clientId: c.clientId, scopes: c.scopes, hotels: c.hotels, environment: c.environment, rateLimitPerMinute: c.rateLimitPerMinute, isActive: c.isActive, expiresAt: c.expiresAt };
  }

  async registerWebhook(input: RegisterWebhookInput): Promise<ApiWebhook> {
    const w = await prisma.apiWebhook.create({ data: { appId: input.appId, hotelId: input.hotelId ?? null, url: input.url, events: input.events } });
    return { id: w.id, appId: w.appId, hotelId: w.hotelId, url: w.url, events: w.events, isActive: w.isActive };
  }
  async listWebhooks(appId: string): Promise<ApiWebhook[]> {
    const rows = await prisma.apiWebhook.findMany({ where: { appId } });
    return rows.map((w) => ({ id: w.id, appId: w.appId, hotelId: w.hotelId, url: w.url, events: w.events, isActive: w.isActive }));
  }
  async setWebhookActive(webhookId: string, isActive: boolean): Promise<void> {
    await prisma.apiWebhook.update({ where: { id: webhookId }, data: { isActive } });
  }
  async findWebhooks(hotelId: string, event: string): Promise<ApiWebhook[]> {
    const rows = await prisma.apiWebhook.findMany({ where: { hotelId, events: { has: event }, isActive: true } });
    return rows.map((w) => ({ id: w.id, appId: w.appId, hotelId: w.hotelId, url: w.url, events: w.events, isActive: w.isActive }));
  }
  async enqueueDelivery(webhookId: string, event: string, payload: Record<string, unknown>): Promise<ApiWebhookDelivery> {
    const d = await prisma.apiWebhookDelivery.create({ data: { webhookId, event, payload: json(payload) } });
    return { id: d.id, webhookId: d.webhookId, event: d.event, status: d.status, attempts: d.attempts, error: d.error };
  }
  async claimDueDeliveries(limit = 10): Promise<ApiWebhookDelivery[]> {
    const rows = await prisma.apiWebhookDelivery.findMany({ where: { status: "PENDING" }, take: limit, orderBy: { createdAt: "asc" } });
    return rows.map((d) => ({ id: d.id, webhookId: d.webhookId, event: d.event, status: d.status, attempts: d.attempts, error: d.error }));
  }
  async markDeliverySuccess(deliveryId: string, response?: string): Promise<void> {
    await prisma.apiWebhookDelivery.update({ where: { id: deliveryId }, data: { status: "SUCCESS", response: response ?? null, attempts: { increment: 1 } } });
  }
  async markDeliveryFailed(deliveryId: string, error: string, retryAt?: Date): Promise<void> {
    await prisma.apiWebhookDelivery.update({ where: { id: deliveryId }, data: { status: "FAILED", error, ...(retryAt ? { nextRetryAt: retryAt } : {}) } });
  }

  async publishMarketplace(input: PublishMarketplaceInput): Promise<ApiMarketplaceApp> {
    const m = await prisma.apiMarketplaceApp.create({ data: { appId: input.appId, name: input.name, category: input.category, summary: input.summary ?? null, iconUrl: input.iconUrl ?? null, isPublished: true } });
    return { id: m.id, appId: m.appId, name: m.name, category: m.category, summary: m.summary, iconUrl: m.iconUrl, version: m.version, isPublished: m.isPublished, installs: m.installs };
  }
  async listMarketplace(publishedOnly = true): Promise<ApiMarketplaceApp[]> {
    const rows = await prisma.apiMarketplaceApp.findMany({ where: publishedOnly ? { isPublished: true } : {} });
    return rows.map((m) => ({ id: m.id, appId: m.appId, name: m.name, category: m.category, summary: m.summary, iconUrl: m.iconUrl, version: m.version, isPublished: m.isPublished, installs: m.installs }));
  }
  async incrementInstalls(marketplaceId: string): Promise<void> {
    await prisma.apiMarketplaceApp.update({ where: { id: marketplaceId }, data: { installs: { increment: 1 } } });
  }

  async logAccess(input: { appId?: string | null; credentialId?: string | null; hotelId?: string | null; method: string; path: string; status: number; latencyMs?: number | null; ip?: string | null; userAgent?: string | null }): Promise<ApiAccessLog> {
    const l = await prisma.apiAccessLog.create({ data: { appId: input.appId ?? null, credentialId: input.credentialId ?? null, hotelId: input.hotelId ?? null, method: input.method, path: input.path, status: input.status, latencyMs: input.latencyMs ?? null, ip: input.ip ?? null, userAgent: input.userAgent ?? null } });
    return { id: l.id, appId: l.appId, credentialId: l.credentialId, hotelId: l.hotelId, method: l.method, path: l.path, status: l.status, latencyMs: l.latencyMs };
  }
  async countRequestsSince(credentialId: string, since: Date): Promise<number> {
    return prisma.apiAccessLog.count({ where: { credentialId, createdAt: { gte: since } } });
  }
  async listLogs(appId: string, limit = 200): Promise<ApiAccessLog[]> {
    const rows = await prisma.apiAccessLog.findMany({ where: { appId }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((l) => ({ id: l.id, appId: l.appId, credentialId: l.credentialId, hotelId: l.hotelId, method: l.method, path: l.path, status: l.status, latencyMs: l.latencyMs }));
  }
}
