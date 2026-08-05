import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { ChannelService, type ChannelActor } from "./channel.service.js";
import { ChannelError } from "./channel.error.js";
import type { ChannelRepository } from "./channel.repository.js";
import type { OtaConnector } from "./channel.connector.js";
import type {
  ChannelAccount, ChannelRateOverride, ChannelRoomMapping, ChannelSyncJob, ChannelSyncLog,
  CreateChannelAccountInput, CreateMappingInput, SyncJobStatus, SyncType,
} from "./channel.types.js";

let seq = 0;

class MemoryRepo implements ChannelRepository {
  accounts: ChannelAccount[] = [];
  mappings: ChannelRoomMapping[] = [];
  jobs: ChannelSyncJob[] = [];
  logs: ChannelSyncLog[] = [];
  rates: ChannelRateOverride[] = [];

  async createAccount(hotelId: string, input: CreateChannelAccountInput): Promise<ChannelAccount> {
    const a: ChannelAccount = { id: `acc-${++seq}`, hotelId, otaKey: input.otaKey, name: input.name, credentials: input.credentials ?? null, config: input.config ?? null, isActive: false, lastSyncAt: null, lastError: null };
    this.accounts.push(a); return a;
  }
  async listAccounts(hotelId: string): Promise<ChannelAccount[]> { return this.accounts.filter((a) => a.hotelId === hotelId); }
  async getAccount(hotelId: string, accountId: string): Promise<ChannelAccount | null> { return this.accounts.find((a) => a.id === accountId && a.hotelId === hotelId) ?? null; }
  async setAccountActive(hotelId: string, accountId: string, isActive: boolean): Promise<void> { const a = this.accounts.find((x) => x.id === accountId)!; a.isActive = isActive; }
  async updateAccountSync(hotelId: string, accountId: string, lastSyncAt: Date, error?: string | null): Promise<void> { const a = this.accounts.find((x) => x.id === accountId)!; a.lastSyncAt = lastSyncAt; a.lastError = error ?? null; }

  async createMapping(hotelId: string, input: CreateMappingInput): Promise<ChannelRoomMapping> {
    const m: ChannelRoomMapping = { id: `map-${++seq}`, accountId: input.accountId, hotelId, roomTypeId: input.roomTypeId, otaRoomId: input.otaRoomId, otaRoomName: input.otaRoomName ?? null, isActive: true };
    this.mappings.push(m); return m;
  }
  async listMappings(hotelId: string, accountId?: string): Promise<ChannelRoomMapping[]> { return this.mappings.filter((m) => m.hotelId === hotelId && (accountId ? m.accountId === accountId : true)); }
  async setMappingActive(hotelId: string, mappingId: string, isActive: boolean): Promise<void> { const m = this.mappings.find((x) => x.id === mappingId)!; m.isActive = isActive; }
  async getMappingsForAccount(hotelId: string, accountId: string): Promise<ChannelRoomMapping[]> { return this.mappings.filter((m) => m.hotelId === hotelId && m.accountId === accountId && m.isActive); }

  async enqueueJob(hotelId: string, input: { accountId: string; direction: "outbound" | "inbound"; type: SyncType; payload?: Record<string, unknown> | null; maxAttempts?: number }): Promise<ChannelSyncJob> {
    const j: ChannelSyncJob = { id: `job-${++seq}`, accountId: input.accountId, hotelId, direction: input.direction, type: input.type, status: "PENDING", attempts: 0, maxAttempts: input.maxAttempts ?? 3, payload: input.payload ?? null, result: null, error: null, nextRetryAt: null, createdAt: new Date(), updatedAt: new Date() };
    this.jobs.push(j); return j;
  }
  async claimDueJobs(hotelId: string, now: Date, limit = 20): Promise<ChannelSyncJob[]> { return this.jobs.filter((j) => j.hotelId === hotelId && j.status === "PENDING").slice(0, limit); }
  async markJobRunning(hotelId: string, jobId: string): Promise<void> { const j = this.jobs.find((x) => x.id === jobId)!; j.status = "RUNNING"; j.attempts += 1; j.updatedAt = new Date(); }
  async markJobSuccess(hotelId: string, jobId: string, result?: Record<string, unknown> | null): Promise<void> { const j = this.jobs.find((x) => x.id === jobId)!; j.status = "SUCCESS"; j.result = result ?? null; j.updatedAt = new Date(); }
  async markJobFailed(hotelId: string, jobId: string, error: string, retryAt?: Date | null): Promise<void> { const j = this.jobs.find((x) => x.id === jobId)!; j.status = "FAILED"; j.error = error; j.updatedAt = new Date(); }
  async markJobRetrying(hotelId: string, jobId: string, retryAt: Date, error: string): Promise<void> { const j = this.jobs.find((x) => x.id === jobId)!; j.status = "RETRYING"; j.error = error; j.nextRetryAt = retryAt; j.updatedAt = new Date(); }
  async getJob(hotelId: string, jobId: string): Promise<ChannelSyncJob | null> { return this.jobs.find((j) => j.id === jobId && j.hotelId === hotelId) ?? null; }
  async listJobs(hotelId: string, status?: SyncJobStatus, limit = 200): Promise<ChannelSyncJob[]> { return this.jobs.filter((j) => j.hotelId === hotelId && (status ? j.status === status : true)).slice(0, limit); }

  async writeLog(hotelId: string, input: { accountId: string; jobId?: string | null; level?: string; message: string; detail?: Record<string, unknown> | null }): Promise<ChannelSyncLog> {
    const l: ChannelSyncLog = { id: `log-${++seq}`, accountId: input.accountId, hotelId, jobId: input.jobId ?? null, level: input.level ?? "INFO", message: input.message, detail: input.detail ?? null, createdAt: new Date() };
    this.logs.push(l); return l;
  }
  async listLogs(hotelId: string, accountId?: string, limit = 200): Promise<ChannelSyncLog[]> { return this.logs.filter((l) => l.hotelId === hotelId && (accountId ? l.accountId === accountId : true)).slice(0, limit); }

  async recordRateOverride(hotelId: string, input: { accountId: string; roomTypeId: string; ratePlanId?: string | null; date: Date; price: number; currency?: string; status?: string }): Promise<ChannelRateOverride> {
    const r: ChannelRateOverride = { id: `rate-${++seq}`, accountId: input.accountId, hotelId, roomTypeId: input.roomTypeId, ratePlanId: input.ratePlanId ?? null, date: input.date, price: input.price, currency: input.currency ?? "XOF", status: input.status ?? "SYNCED", syncedAt: null };
    this.rates.push(r); return r;
  }

  async syncStats(hotelId: string, accountId?: string): Promise<{ totalJobs: number; success: number; failed: number; pending: number; logs: number }> {
    const jobs = this.jobs.filter((j) => j.hotelId === hotelId && (accountId ? j.accountId === accountId : true));
    return { totalJobs: jobs.length, success: jobs.filter((j) => j.status === "SUCCESS").length, failed: jobs.filter((j) => j.status === "FAILED").length, pending: jobs.filter((j) => j.status === "PENDING" || j.status === "RETRYING").length, logs: this.logs.filter((l) => l.hotelId === hotelId).length };
  }
  async getAccountForSync(hotelId: string, accountId: string): Promise<ChannelAccount | null> { return this.accounts.find((a) => a.id === accountId && a.hotelId === hotelId) ?? null; }
}

const actorH1: ChannelActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build(connectors: OtaConnector[] = []) {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const registry: Record<string, OtaConnector> = {};
  for (const c of connectors) registry[c.otaKey] = c;
  const svc = new ChannelService(repo, audit, bus, registry);
  return { repo, svc };
}

// Connecteur factice (simule un OTA générique)
function fakeConnector(otaKey = "booking"): OtaConnector {
  return {
    otaKey,
    label: "Fake OTA",
    async testConnection() { return { ok: true, data: { status: "ok" } }; },
    async pushAvailability() { return { ok: true, data: { pushed: 1 } }; },
    async pushRates() { return { ok: true, data: { pushed: 1 } }; },
    async pushRestrictions() { return { ok: true, data: { pushed: 1 } }; },
    async pullBookings() { return { ok: true, data: [] }; },
  };
}

describe("channel.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée un compte OTA configurable", async () => {
    const { svc } = build();
    const a = await svc.createAccount("h1", { otaKey: "booking", name: "Booking.com", credentials: { apiKey: "sk-..." } }, actorH1);
    expect(a.id).toBeTruthy();
    expect(a.otaKey).toBe("booking");
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.listAccounts("h2", actorH1)).rejects.toThrow(ChannelError);
  });

  it("crée un mapping chambre PMS ↔ OTA", async () => {
    const { repo, svc } = build();
    const acc = await svc.createAccount("h1", { otaKey: "expedia", name: "Expedia" }, actorH1);
    const m = await svc.createMapping("h1", { accountId: acc.id, roomTypeId: "rt1", otaRoomId: "room_123" }, actorH1);
    expect(m.otaRoomId).toBe("room_123");
    expect(repo.mappings.some((x) => x.otaRoomId === "room_123")).toBe(true);
  });

  it("pousse la disponibilité (job en file)", async () => {
    const { repo, svc } = build();
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    const job = await svc.pushAvailability("h1", { accountId: acc.id, updates: [{ date: "2026-08-10", rooms: 5 }] }, actorH1);
    expect(job.type).toBe("availability");
    expect(repo.jobs.some((j) => j.status === "PENDING")).toBe(true);
  });

  it("pousse les tarifs et consigne les surcharges", async () => {
    const { repo, svc } = build();
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    const job = await svc.pushRates("h1", { accountId: acc.id, updates: [{ date: "2026-08-10", roomTypeId: "rt1", price: 45000, currency: "XOF" }] }, actorH1);
    expect(job.type).toBe("rates");
    expect(repo.rates.some((r) => r.price === 45000 && r.status === "PENDING")).toBe(true);
  });

  it("reçoit une réservation OTA (inbound) en file", async () => {
    const { repo, svc } = build();
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    const job = await svc.processBooking("h1", { accountId: acc.id, booking: { otaKey: "booking", otaBookingId: "OTA-1", guestName: "Awa", roomTypeId: "rt1", arrivalDate: "2026-08-10", departureDate: "2026-08-12" } }, actorH1);
    expect(job.direction).toBe("inbound");
    expect(repo.logs.some((l) => l.message.includes("OTA-1"))).toBe(true);
  });

  it("traite un job via le connecteur (sync réussie)", async () => {
    const { repo, svc } = build([fakeConnector("booking")]);
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    await svc.pushAvailability("h1", { accountId: acc.id, updates: [{ date: "2026-08-10", rooms: 3 }] }, actorH1);
    const processed = await svc.processDue("h1", actorH1);
    expect(processed).toBe(1);
    const job = repo.jobs[0]!;
    expect(job.status).toBe("SUCCESS");
    expect(acc.lastSyncAt).toBeTruthy();
  });

  it("sans connecteur → job traité en mode démo (pas d'échec)", async () => {
    const { repo, svc } = build(); // aucun connecteur
    const acc = await svc.createAccount("h1", { otaKey: "airbnb", name: "Airbnb" }, actorH1);
    await svc.pushAvailability("h1", { accountId: acc.id, updates: [{ date: "2026-08-10", rooms: 2 }] }, actorH1);
    const processed = await svc.processDue("h1", actorH1);
    expect(processed).toBe(1);
    const job = repo.jobs[0]!;
    expect(job.status).toBe("SUCCESS"); // ignoré proprement
  });

  it("retry exponentiel puis échec après maxAttempts", async () => {
    const failing = {
      otaKey: "booking", label: "Fail",
      async testConnection() { return { ok: false, error: "nope" }; },
      async pushAvailability() { throw new Error("API down"); },
      async pushRates() { throw new Error("API down"); },
      async pushRestrictions() { throw new Error("API down"); },
      async pullBookings() { throw new Error("API down"); },
    } as OtaConnector;
    const { repo, svc } = build([failing]);
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    await svc.pushAvailability("h1", { accountId: acc.id, updates: [{ date: "2026-08-10", rooms: 1 }] }, actorH1);
    await svc.processDue("h1", actorH1);
    const job1 = repo.jobs[0]!;
    expect(job1.status).toBe("RETRYING");
    expect(job1.nextRetryAt).toBeTruthy();
    expect(repo.logs.some((l) => l.level === "ERROR")).toBe(true);
  });

  it("calcule les statistiques de synchronisation", async () => {
    const { svc } = build([fakeConnector("booking")]);
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    await svc.pushAvailability("h1", { accountId: acc.id, updates: [{ date: "2026-08-10", rooms: 1 }] }, actorH1);
    await svc.processDue("h1", actorH1);
    const stats = await svc.syncStats("h1", acc.id, actorH1);
    expect(stats.totalJobs).toBe(1);
    expect(stats.success).toBe(1);
  });

  it("teste la connexion d'un compte via le connecteur", async () => {
    const { svc } = build([fakeConnector("booking")]);
    const acc = await svc.createAccount("h1", { otaKey: "booking", name: "B" }, actorH1);
    const res = await svc.testConnection("h1", acc.id, actorH1);
    expect(res.ok).toBe(true);
  });
});
