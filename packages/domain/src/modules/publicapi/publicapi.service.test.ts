import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { PublicApiService, type PublicApiActor } from "./publicapi.service.js";
import { PublicApiError } from "./publicapi.error.js";
import type { PublicApiRepository } from "./publicapi.repository.js";
import type {
  ApiAccessLog, ApiApp, ApiCredential, ApiMarketplaceApp, ApiWebhook, ApiWebhookDelivery,
  CreateApiAppInput, CreateCredentialInput, PublishMarketplaceInput, RegisterWebhookInput,
} from "./publicapi.types.js";

let seq = 0;

class MemoryRepo implements PublicApiRepository {
  apps: ApiApp[] = [];
  credentials: ApiCredential[] = [];
  webhooks: ApiWebhook[] = [];
  deliveries: ApiWebhookDelivery[] = [];
  marketplace: ApiMarketplaceApp[] = [];
  logs: ApiAccessLog[] = [];
  requests = new Map<string, number>();

  async createApp(input: CreateApiAppInput & { ownerOrgId?: string | null; ownerUserId?: string | null }): Promise<ApiApp> {
    const a: ApiApp = { id: `app-${++seq}`, name: input.name, description: input.description ?? null, ownerOrgId: input.ownerOrgId ?? null, ownerUserId: input.ownerUserId ?? null, environment: input.environment ?? "SANDBOX", isActive: true };
    this.apps.push(a); return a;
  }
  async listApps(ownerOrgId: string): Promise<ApiApp[]> { return this.apps.filter((a) => a.ownerOrgId === ownerOrgId); }
  async getApp(appId: string): Promise<ApiApp | null> { return this.apps.find((a) => a.id === appId) ?? null; }

  async createCredential(appId: string, input: CreateCredentialInput & { clientId: string; secretHash: string }): Promise<ApiCredential> {
    const c: ApiCredential = { id: `cred-${++seq}`, appId, kind: input.kind ?? "API_KEY", clientId: input.clientId, secretHash: input.secretHash, scopes: input.scopes ?? [], hotels: input.hotels ?? [], environment: "SANDBOX", rateLimitPerMinute: input.rateLimitPerMinute ?? 60, isActive: true, expiresAt: null };
    this.credentials.push(c); return c;
  }
  async listCredentials(appId: string): Promise<ApiCredential[]> { return this.credentials.filter((c) => c.appId === appId); }
  async revokeCredential(credentialId: string): Promise<void> { const c = this.credentials.find((x) => x.id === credentialId)!; c.isActive = false; }
  async authenticate(clientId: string, secretHash: string): Promise<ApiCredential | null> { return this.credentials.find((c) => c.clientId === clientId && c.secretHash === secretHash) ?? null; }

  async registerWebhook(input: RegisterWebhookInput): Promise<ApiWebhook> {
    const w: ApiWebhook = { id: `wh-${++seq}`, appId: input.appId, hotelId: input.hotelId ?? null, url: input.url, events: input.events, isActive: true };
    this.webhooks.push(w); return w;
  }
  async listWebhooks(appId: string): Promise<ApiWebhook[]> { return this.webhooks.filter((w) => w.appId === appId); }
  async setWebhookActive(webhookId: string, isActive: boolean): Promise<void> { const w = this.webhooks.find((x) => x.id === webhookId)!; w.isActive = isActive; }
  async findWebhooks(hotelId: string, event: string): Promise<ApiWebhook[]> { return this.webhooks.filter((w) => w.hotelId === hotelId && w.events.includes(event)); }
  async enqueueDelivery(webhookId: string, event: string, payload: Record<string, unknown>): Promise<ApiWebhookDelivery> {
    const d: ApiWebhookDelivery = { id: `del-${++seq}`, webhookId, event, status: "PENDING", attempts: 0, error: null };
    this.deliveries.push(d); return d;
  }
  async claimDueDeliveries(limit = 10): Promise<ApiWebhookDelivery[]> { return this.deliveries.filter((d) => d.status === "PENDING").slice(0, limit); }
  async markDeliverySuccess(deliveryId: string, response?: string): Promise<void> { const d = this.deliveries.find((x) => x.id === deliveryId)!; d.status = "SUCCESS"; d.attempts += 1; }
  async markDeliveryFailed(deliveryId: string, error: string, retryAt?: Date): Promise<void> { const d = this.deliveries.find((x) => x.id === deliveryId)!; d.status = "FAILED"; d.error = error; }

  async publishMarketplace(input: PublishMarketplaceInput): Promise<ApiMarketplaceApp> {
    const m: ApiMarketplaceApp = { id: `mp-${++seq}`, appId: input.appId, name: input.name, category: input.category, summary: input.summary ?? null, iconUrl: input.iconUrl ?? null, version: "1.0.0", isPublished: true, installs: 0 };
    this.marketplace.push(m); return m;
  }
  async listMarketplace(publishedOnly?: boolean): Promise<ApiMarketplaceApp[]> { return this.marketplace.filter((m) => (publishedOnly ? m.isPublished : true)); }
  async incrementInstalls(marketplaceId: string): Promise<void> { const m = this.marketplace.find((x) => x.id === marketplaceId)!; m.installs += 1; }

  async logAccess(input: { appId?: string | null; credentialId?: string | null; hotelId?: string | null; method: string; path: string; status: number; latencyMs?: number | null; ip?: string | null; userAgent?: string | null }): Promise<ApiAccessLog> {
    const l: ApiAccessLog = { id: `log-${++seq}`, appId: input.appId ?? null, credentialId: input.credentialId ?? null, hotelId: input.hotelId ?? null, method: input.method, path: input.path, status: input.status, latencyMs: input.latencyMs ?? null };
    this.logs.push(l); return l;
  }
  async countRequestsSince(credentialId: string, since: Date): Promise<number> { return this.requests.get(credentialId) ?? 0; }
  async listLogs(appId: string, limit = 200): Promise<ApiAccessLog[]> { return this.logs.filter((l) => l.appId === appId).slice(0, limit); }
}

const actor: PublicApiActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new PublicApiService(repo, audit, bus);
  return { repo, svc };
}

describe("publicapi.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée une application tierce", async () => {
    const { repo, svc } = build();
    const app = await svc.createApp({ name: "PartnerApp", environment: "SANDBOX" }, actor);
    expect(app.id).toBeTruthy();
    expect(repo.apps.length).toBe(1);
  });

  it("génère une credential et renvoie le secret en clair une fois", async () => {
    const { repo, svc } = build();
    const app = await svc.createApp({ name: "PartnerApp" }, actor);
    const { credential, secret } = await svc.createCredential(app.id, { scopes: ["reservations.read"] }, actor);
    expect(secret).toBeTruthy();
    expect(credential.clientId).toMatch(/^af_/);
    expect(credential.secretHash).not.toContain(secret);
    expect(repo.credentials.length).toBe(1);
  });

  it("authentifie une requête avec la bonne clé", async () => {
    const { svc } = build();
    const app = await svc.createApp({ name: "PartnerApp" }, actor);
    const { credential, secret } = await svc.createCredential(app.id, { scopes: ["reservations.read"] }, actor);
    const auth = await svc.authenticate(credential.clientId, secret, actor);
    expect(auth.appId).toBe(app.id);
    expect(auth.scopes).toContain("reservations.read");
  });

  it("rejette une clé invalide", async () => {
    const { svc } = build();
    const app = await svc.createApp({ name: "PartnerApp" }, actor);
    await svc.createCredential(app.id, { scopes: [] }, actor);
    await expect(svc.authenticate("inconnu", "secret", actor)).rejects.toThrow(PublicApiError);
  });

  it("enregistre un webhook et dispatch un événement", async () => {
    const { repo, svc } = build();
    const app = await svc.createApp({ name: "PartnerApp" }, actor);
    await svc.registerWebhook({ appId: app.id, hotelId: "h1", url: "https://partner.example.com/hook", events: ["reservation.created"] }, actor);
    const count = await svc.dispatchEvent("h1", "reservation.created", { reservationId: "r1" }, actor);
    expect(count).toBe(1);
    expect(repo.deliveries.length).toBe(1);
  });

  it("traite les livraisons de webhooks", async () => {
    const { repo, svc } = build();
    const app = await svc.createApp({ name: "PartnerApp" }, actor);
    await svc.registerWebhook({ appId: app.id, hotelId: "h1", url: "https://p.com/h", events: ["x"] }, actor);
    await svc.dispatchEvent("h1", "x", {}, actor);
    const processed = await svc.processWebhookDeliveries(actor);
    expect(processed).toBe(1);
    expect(repo.deliveries[0]!.status).toBe("SUCCESS");
  });

  it("publie et installe une app du marketplace", async () => {
    const { repo, svc } = build();
    const app = await svc.createApp({ name: "ConnectorApp" }, actor);
    await svc.publishMarketplace({ appId: app.id, name: "Connecteur X", category: "connector" }, actor);
    const listed = await svc.listMarketplace(true, actor);
    expect(listed.length).toBe(1);
    await svc.installMarketplace(listed[0]!.id, actor);
    expect(repo.marketplace[0]!.installs).toBe(1);
  });

  it("journalise les accès API", async () => {
    const { repo, svc } = build();
    const app = await svc.createApp({ name: "PartnerApp" }, actor);
    await svc.logAccess({ appId: app.id, method: "GET", path: "/v1/reservations", status: 200, hotelId: "h1" }, actor);
    expect(repo.logs.length).toBe(1);
    const logs = await svc.listLogs(app.id, actor);
    expect(logs[0]!.path).toBe("/v1/reservations");
  });
});
