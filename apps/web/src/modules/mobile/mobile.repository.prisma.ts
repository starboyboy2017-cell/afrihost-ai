/**
 * Module 31 — Plateforme Mobile : adapter Prisma.
 */
import type {
  MobileRepository,
  MobileDevice,
  MobileSyncLog,
  PushToken,
  RegisterDeviceInput,
  RegisterPushTokenInput,
  SyncOperation,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaMobileRepository implements MobileRepository {
  async registerDevice(hotelId: string, input: RegisterDeviceInput): Promise<MobileDevice> {
    const existing = await prisma.mobileDevice.findUnique({ where: { installId: input.installId } });
    if (existing) {
      const d = await prisma.mobileDevice.update({ where: { id: existing.id }, data: { lastActiveAt: new Date(), deviceName: input.deviceName ?? existing.deviceName, platform: input.platform ?? existing.platform } });
      return this.mapDevice(d);
    }
    const d = await prisma.mobileDevice.create({ data: { hotelId, installId: input.installId, deviceName: input.deviceName ?? null, platform: input.platform ?? null, userId: input.userId ?? null, guestId: input.guestId ?? null, lastActiveAt: new Date() } });
    return this.mapDevice(d);
  }
  async listDevices(hotelId: string): Promise<MobileDevice[]> {
    const rows = await prisma.mobileDevice.findMany({ where: { hotelId }, orderBy: { lastActiveAt: "desc" } });
    return rows.map((d) => this.mapDevice(d));
  }
  async setDeviceActive(hotelId: string, deviceId: string, isActive: boolean): Promise<void> {
    await prisma.mobileDevice.update({ where: { id: deviceId, hotelId }, data: { isActive } });
  }
  async touchDevice(hotelId: string, installId: string): Promise<void> {
    await prisma.mobileDevice.updateMany({ where: { hotelId, installId }, data: { lastActiveAt: new Date() } });
  }

  async registerPushToken(hotelId: string, input: RegisterPushTokenInput): Promise<PushToken> {
    const existing = await prisma.pushToken.findUnique({ where: { token: input.token } });
    if (existing) {
      const t = await prisma.pushToken.update({ where: { id: existing.id }, data: { isActive: true } });
      return this.mapToken(t);
    }
    const t = await prisma.pushToken.create({ data: { hotelId, deviceId: input.deviceId ?? null, userId: input.userId ?? null, guestId: input.guestId ?? null, platform: input.platform ?? null, token: input.token } });
    return this.mapToken(t);
  }
  async listPushTokens(hotelId: string): Promise<PushToken[]> {
    const rows = await prisma.pushToken.findMany({ where: { hotelId, isActive: true } });
    return rows.map((t) => this.mapToken(t));
  }
  async revokePushToken(hotelId: string, token: string): Promise<void> {
    await prisma.pushToken.updateMany({ where: { hotelId, token }, data: { isActive: false } });
  }

  async recordSyncOperation(hotelId: string, input: SyncOperation): Promise<MobileSyncLog> {
    const s = await prisma.mobileSyncLog.create({ data: { hotelId, entityType: input.entityType, entityId: input.entityId, operation: input.operation, status: "PENDING" } });
    return this.mapSync(s);
  }
  async listPendingSync(hotelId: string): Promise<MobileSyncLog[]> {
    const rows = await prisma.mobileSyncLog.findMany({ where: { hotelId, status: "PENDING" }, orderBy: { createdAt: "asc" } });
    return rows.map((s) => this.mapSync(s));
  }
  async markSyncSynced(hotelId: string, syncId: string): Promise<void> {
    await prisma.mobileSyncLog.updateMany({ where: { id: syncId, hotelId }, data: { status: "SYNCED", syncedAt: new Date() } });
  }
  async markSyncFailed(hotelId: string, syncId: string, error: string): Promise<void> {
    await prisma.mobileSyncLog.updateMany({ where: { id: syncId, hotelId }, data: { status: "FAILED", error } });
  }

  async countAlerts(hotelId: string): Promise<number> { return prisma.aiAlert.count({ where: { hotelId, status: "OPEN" } }); }
  async countPendingTasks(hotelId: string): Promise<number> { return prisma.customerTask.count({ where: { hotelId, done: false } }); }
  async occupancyRate(hotelId: string): Promise<number> {
    const total = await prisma.room.count({ where: { hotelId } });
    if (total === 0) return 0;
    const occupied = await prisma.room.count({ where: { hotelId, status: "OCCUPIED" } });
    return Math.round((occupied / total) * 10000) / 100;
  }
  async countCheckinsToday(hotelId: string): Promise<number> {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return prisma.reservation.count({ where: { hotelId, arrivalDate: { gte: start } } });
  }
  async countCheckoutsToday(hotelId: string): Promise<number> {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return prisma.reservation.count({ where: { hotelId, departureDate: { gte: start } } });
  }
  async countPendingSync(hotelId: string): Promise<number> { return prisma.mobileSyncLog.count({ where: { hotelId, status: "PENDING" } }); }

  private mapDevice(d: { id: string; hotelId: string; userId: string | null; guestId: string | null; deviceName: string | null; platform: string | null; installId: string; lastActiveAt: Date | null; isActive: boolean }): MobileDevice {
    return { id: d.id, hotelId: d.hotelId, userId: d.userId, guestId: d.guestId, deviceName: d.deviceName, platform: d.platform, installId: d.installId, lastActiveAt: d.lastActiveAt, isActive: d.isActive };
  }
  private mapToken(t: { id: string; hotelId: string; deviceId: string | null; userId: string | null; guestId: string | null; platform: string | null; token: string; isActive: boolean }): PushToken {
    return { id: t.id, hotelId: t.hotelId, deviceId: t.deviceId, userId: t.userId, guestId: t.guestId, platform: t.platform, token: t.token, isActive: t.isActive };
  }
  private mapSync(s: { id: string; hotelId: string; deviceId: string | null; entityType: string; entityId: string; operation: string; status: string; error: string | null }): MobileSyncLog {
    return { id: s.id, hotelId: s.hotelId, deviceId: s.deviceId, entityType: s.entityType, entityId: s.entityId, operation: s.operation, status: s.status, error: s.error };
  }
}
