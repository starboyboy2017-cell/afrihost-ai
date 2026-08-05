/**
 * Module 25 — Channel Manager / OTA : adapter Prisma.
 */
import type {
  ChannelRepository,
  ChannelAccount,
  ChannelRateOverride,
  ChannelRoomMapping,
  ChannelSyncJob,
  ChannelSyncLog,
  CreateChannelAccountInput,
  CreateMappingInput,
  SyncJobStatus,
  SyncType,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue | undefined => v as Prisma.InputJsonValue;

function mapAccount(a: {
  id: string; hotelId: string; otaKey: string; name: string; credentials: unknown; config: unknown;
  isActive: boolean; lastSyncAt: Date | null; lastError: string | null;
}): ChannelAccount {
  return { id: a.id, hotelId: a.hotelId, otaKey: a.otaKey, name: a.name, credentials: a.credentials as Record<string, unknown> | null, config: a.config as Record<string, unknown> | null, isActive: a.isActive, lastSyncAt: a.lastSyncAt, lastError: a.lastError };
}

function mapJob(j: {
  id: string; accountId: string; hotelId: string; direction: string; type: string; status: string;
  attempts: number; maxAttempts: number; payload: unknown; result: unknown; error: string | null;
  nextRetryAt: Date | null; createdAt: Date; updatedAt: Date;
}): ChannelSyncJob {
  return { id: j.id, accountId: j.accountId, hotelId: j.hotelId, direction: j.direction as ChannelSyncJob["direction"], type: j.type as SyncType, status: j.status as SyncJobStatus, attempts: j.attempts, maxAttempts: j.maxAttempts, payload: j.payload as Record<string, unknown> | null, result: j.result as Record<string, unknown> | null, error: j.error, nextRetryAt: j.nextRetryAt, createdAt: j.createdAt, updatedAt: j.updatedAt };
}

export class PrismaChannelRepository implements ChannelRepository {
  async createAccount(hotelId: string, input: CreateChannelAccountInput): Promise<ChannelAccount> {
    const a = await prisma.channelAccount.create({ data: { hotelId, otaKey: input.otaKey, name: input.name, credentials: input.credentials ? json(input.credentials) : undefined, config: input.config ? json(input.config) : undefined } });
    return mapAccount(a);
  }
  async listAccounts(hotelId: string): Promise<ChannelAccount[]> {
    const rows = await prisma.channelAccount.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map(mapAccount);
  }
  async getAccount(hotelId: string, accountId: string): Promise<ChannelAccount | null> {
    const a = await prisma.channelAccount.findFirst({ where: { id: accountId, hotelId } });
    return a ? mapAccount(a) : null;
  }
  async setAccountActive(hotelId: string, accountId: string, isActive: boolean): Promise<void> {
    await prisma.channelAccount.update({ where: { id: accountId, hotelId }, data: { isActive } });
  }
  async updateAccountSync(hotelId: string, accountId: string, lastSyncAt: Date, error?: string | null): Promise<void> {
    await prisma.channelAccount.update({ where: { id: accountId, hotelId }, data: { lastSyncAt, lastError: error ?? null } });
  }

  async createMapping(hotelId: string, input: CreateMappingInput): Promise<ChannelRoomMapping> {
    const m = await prisma.channelRoomMapping.create({ data: { accountId: input.accountId, hotelId, roomTypeId: input.roomTypeId, otaRoomId: input.otaRoomId, otaRoomName: input.otaRoomName ?? null } });
    return { id: m.id, accountId: m.accountId, hotelId: m.hotelId, roomTypeId: m.roomTypeId, otaRoomId: m.otaRoomId, otaRoomName: m.otaRoomName, isActive: m.isActive };
  }
  async listMappings(hotelId: string, accountId?: string): Promise<ChannelRoomMapping[]> {
    const rows = await prisma.channelRoomMapping.findMany({ where: { hotelId, ...(accountId ? { accountId } : {}) }, orderBy: { roomTypeId: "asc" } });
    return rows.map((m) => ({ id: m.id, accountId: m.accountId, hotelId: m.hotelId, roomTypeId: m.roomTypeId, otaRoomId: m.otaRoomId, otaRoomName: m.otaRoomName, isActive: m.isActive }));
  }
  async setMappingActive(hotelId: string, mappingId: string, isActive: boolean): Promise<void> {
    await prisma.channelRoomMapping.update({ where: { id: mappingId, hotelId }, data: { isActive } });
  }
  async getMappingsForAccount(hotelId: string, accountId: string): Promise<ChannelRoomMapping[]> {
    const rows = await prisma.channelRoomMapping.findMany({ where: { hotelId, accountId, isActive: true } });
    return rows.map((m) => ({ id: m.id, accountId: m.accountId, hotelId: m.hotelId, roomTypeId: m.roomTypeId, otaRoomId: m.otaRoomId, otaRoomName: m.otaRoomName, isActive: m.isActive }));
  }

  async enqueueJob(hotelId: string, input: { accountId: string; direction: "outbound" | "inbound"; type: SyncType; payload?: Record<string, unknown> | null; maxAttempts?: number }): Promise<ChannelSyncJob> {
    const j = await prisma.channelSyncJob.create({ data: { hotelId, accountId: input.accountId, direction: input.direction, type: input.type, payload: input.payload ? json(input.payload) : undefined, maxAttempts: input.maxAttempts ?? 3 } });
    return mapJob(j);
  }
  async claimDueJobs(hotelId: string, now: Date, limit = 20): Promise<ChannelSyncJob[]> {
    const rows = await prisma.channelSyncJob.findMany({ where: { hotelId, status: "PENDING" }, orderBy: { createdAt: "asc" }, take: limit });
    return rows.map(mapJob);
  }
  async markJobRunning(hotelId: string, jobId: string): Promise<void> {
    await prisma.channelSyncJob.updateMany({ where: { id: jobId, hotelId }, data: { status: "RUNNING", attempts: { increment: 1 } } });
  }
  async markJobSuccess(hotelId: string, jobId: string, result?: Record<string, unknown> | null): Promise<void> {
    await prisma.channelSyncJob.updateMany({ where: { id: jobId, hotelId }, data: { status: "SUCCESS", result: result ? json(result) : undefined } });
  }
  async markJobFailed(hotelId: string, jobId: string, error: string, retryAt?: Date | null): Promise<void> {
    await prisma.channelSyncJob.updateMany({ where: { id: jobId, hotelId }, data: { status: "FAILED", error } });
  }
  async markJobRetrying(hotelId: string, jobId: string, retryAt: Date, error: string): Promise<void> {
    await prisma.channelSyncJob.updateMany({ where: { id: jobId, hotelId }, data: { status: "RETRYING", nextRetryAt: retryAt, error } });
  }
  async getJob(hotelId: string, jobId: string): Promise<ChannelSyncJob | null> {
    const j = await prisma.channelSyncJob.findFirst({ where: { id: jobId, hotelId } });
    return j ? mapJob(j) : null;
  }
  async listJobs(hotelId: string, status?: SyncJobStatus, limit = 200): Promise<ChannelSyncJob[]> {
    const rows = await prisma.channelSyncJob.findMany({ where: { hotelId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map(mapJob);
  }

  async writeLog(hotelId: string, input: { accountId: string; jobId?: string | null; level?: string; message: string; detail?: Record<string, unknown> | null }): Promise<ChannelSyncLog> {
    const l = await prisma.channelSyncLog.create({ data: { hotelId, accountId: input.accountId, jobId: input.jobId ?? null, level: input.level ?? "INFO", message: input.message, detail: input.detail ? json(input.detail) : undefined } });
    return { id: l.id, accountId: l.accountId, hotelId: l.hotelId, jobId: l.jobId, level: l.level, message: l.message, detail: l.detail as Record<string, unknown> | null, createdAt: l.createdAt };
  }
  async listLogs(hotelId: string, accountId?: string, limit = 200): Promise<ChannelSyncLog[]> {
    const rows = await prisma.channelSyncLog.findMany({ where: { hotelId, ...(accountId ? { accountId } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((l) => ({ id: l.id, accountId: l.accountId, hotelId: l.hotelId, jobId: l.jobId, level: l.level, message: l.message, detail: l.detail as Record<string, unknown> | null, createdAt: l.createdAt }));
  }

  async recordRateOverride(hotelId: string, input: { accountId: string; roomTypeId: string; ratePlanId?: string | null; date: Date; price: number; currency?: string; status?: string }): Promise<ChannelRateOverride> {
    const r = await prisma.channelRateOverride.create({ data: { hotelId, accountId: input.accountId, roomTypeId: input.roomTypeId, ratePlanId: input.ratePlanId ?? null, date: input.date, price: input.price, currency: input.currency ?? "XOF", status: input.status ?? "SYNCED" } });
    return { id: r.id, accountId: r.accountId, hotelId: r.hotelId, roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId, date: r.date, price: r.price, currency: r.currency, status: r.status, syncedAt: r.syncedAt };
  }

  async syncStats(hotelId: string, accountId?: string): Promise<{ totalJobs: number; success: number; failed: number; pending: number; logs: number }> {
    const where = { hotelId, ...(accountId ? { accountId } : {}) };
    const [totalJobs, success, failed, pending, logs] = await Promise.all([
      prisma.channelSyncJob.count({ where }),
      prisma.channelSyncJob.count({ where: { ...where, status: "SUCCESS" } }),
      prisma.channelSyncJob.count({ where: { ...where, status: "FAILED" } }),
      prisma.channelSyncJob.count({ where: { ...where, status: { in: ["PENDING", "RETRYING"] } } }),
      prisma.channelSyncLog.count({ where }),
    ]);
    return { totalJobs, success, failed, pending, logs };
  }
  async getAccountForSync(hotelId: string, accountId: string): Promise<ChannelAccount | null> {
    return this.getAccount(hotelId, accountId);
  }
}
