import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { MobileService, type MobileActor } from "./mobile.service.js";
import { MobileError } from "./mobile.error.js";
import type { MobileRepository } from "./mobile.repository.js";
import type { MobileDevice, MobileSyncLog, PushToken, RegisterDeviceInput, RegisterPushTokenInput, SyncOperation } from "./mobile.types.js";

let seq = 0;

class MemoryRepo implements MobileRepository {
  devices: MobileDevice[] = [];
  tokens: PushToken[] = [];
  syncs: MobileSyncLog[] = [];

  async registerDevice(hotelId: string, input: RegisterDeviceInput): Promise<MobileDevice> {
    const existing = this.devices.find((d) => d.hotelId === hotelId && d.installId === input.installId);
    if (existing) { existing.lastActiveAt = new Date(); return existing; }
    const d: MobileDevice = { id: `dev-${++seq}`, hotelId, userId: input.userId ?? null, guestId: input.guestId ?? null, deviceName: input.deviceName ?? null, platform: input.platform ?? null, installId: input.installId, lastActiveAt: new Date(), isActive: true };
    this.devices.push(d); return d;
  }
  async listDevices(hotelId: string): Promise<MobileDevice[]> { return this.devices.filter((d) => d.hotelId === hotelId); }
  async setDeviceActive(hotelId: string, deviceId: string, isActive: boolean): Promise<void> { const d = this.devices.find((x) => x.id === deviceId)!; d.isActive = isActive; }
  async touchDevice(hotelId: string, installId: string): Promise<void> { const d = this.devices.find((x) => x.hotelId === hotelId && x.installId === installId); if (d) d.lastActiveAt = new Date(); }

  async registerPushToken(hotelId: string, input: RegisterPushTokenInput): Promise<PushToken> {
    const t: PushToken = { id: `tok-${++seq}`, hotelId, deviceId: input.deviceId ?? null, userId: input.userId ?? null, guestId: input.guestId ?? null, platform: input.platform ?? null, token: input.token, isActive: true };
    this.tokens.push(t); return t;
  }
  async listPushTokens(hotelId: string): Promise<PushToken[]> { return this.tokens.filter((t) => t.hotelId === hotelId && t.isActive); }
  async revokePushToken(hotelId: string, token: string): Promise<void> { const t = this.tokens.find((x) => x.token === token)!; t.isActive = false; }

  async recordSyncOperation(hotelId: string, input: SyncOperation): Promise<MobileSyncLog> {
    const s: MobileSyncLog = { id: `sync-${++seq}`, hotelId, entityType: input.entityType, entityId: input.entityId, operation: input.operation, status: "PENDING", error: null };
    this.syncs.push(s); return s;
  }
  async listPendingSync(hotelId: string): Promise<MobileSyncLog[]> { return this.syncs.filter((s) => s.hotelId === hotelId && s.status === "PENDING"); }
  async markSyncSynced(hotelId: string, syncId: string): Promise<void> { const s = this.syncs.find((x) => x.id === syncId)!; s.status = "SYNCED"; }
  async markSyncFailed(hotelId: string, syncId: string, error: string): Promise<void> { const s = this.syncs.find((x) => x.id === syncId)!; s.status = "FAILED"; s.error = error; }

  async countAlerts(hotelId: string): Promise<number> { return 2; }
  async countPendingTasks(hotelId: string): Promise<number> { return 5; }
  async occupancyRate(hotelId: string): Promise<number> { return 74.5; }
  async countCheckinsToday(hotelId: string): Promise<number> { return 8; }
  async countCheckoutsToday(hotelId: string): Promise<number> { return 6; }
  async countPendingSync(hotelId: string): Promise<number> { return this.syncs.filter((s) => s.status === "PENDING").length; }
}

const actorH1: MobileActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new MobileService(repo, audit, bus);
  return { repo, svc };
}

describe("mobile.service", () => {
  beforeEach(() => { seq = 0; });

  it("enregistre un appareil (idempotent par installId)", async () => {
    const { repo, svc } = build();
    const d = await svc.registerDevice("h1", { installId: "inst-1", platform: "pwa", deviceName: "iPhone" }, actorH1);
    expect(d.installId).toBe("inst-1");
    const again = await svc.registerDevice("h1", { installId: "inst-1" }, actorH1);
    expect(again.id).toBe(d.id);
    expect(repo.devices.length).toBe(1);
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.listDevices("h2", actorH1)).rejects.toThrow(MobileError);
  });

  it("enregistre un token push", async () => {
    const { repo, svc } = build();
    await svc.registerPushToken("h1", { token: "fcm-token-123", platform: "android" }, actorH1);
    expect(repo.tokens.length).toBe(1);
    const tokens = await svc.listPushTokens("h1", actorH1);
    expect(tokens.length).toBe(1);
  });

  it("pousse une opération offline et la marque synchronisée", async () => {
    const { repo, svc } = build();
    const log = await svc.pushSync("h1", { entityType: "Reservation", entityId: "r1", operation: "CREATE", payload: { status: "CONFIRMED" } }, actorH1);
    expect(log.status).toBe("SYNCED");
    expect(repo.syncs.length).toBe(1);
  });

  it("fournit le tableau de bord mobile par rôle", async () => {
    const { svc } = build();
    const dash = await svc.dashboard("h1", "MANAGER", actorH1);
    expect(dash.role).toBe("MANAGER");
    expect(dash.occupancyRate).toBe(74.5);
    expect(dash.alerts).toBe(2);
    expect(dash.tasks).toBe(5);
  });
});
