/**
 * Module 25 — Channel Manager / OTA : port de persistance.
 */
import type {
  ChannelAccount,
  ChannelRateOverride,
  ChannelRoomMapping,
  ChannelSyncJob,
  ChannelSyncLog,
  CreateChannelAccountInput,
  CreateMappingInput,
  SyncJobStatus,
  SyncType,
} from "./channel.types.js";

export interface ChannelRepository {
  // Comptes OTA
  createAccount(hotelId: string, input: CreateChannelAccountInput): Promise<ChannelAccount>;
  listAccounts(hotelId: string): Promise<ChannelAccount[]>;
  getAccount(hotelId: string, accountId: string): Promise<ChannelAccount | null>;
  setAccountActive(hotelId: string, accountId: string, isActive: boolean): Promise<void>;
  updateAccountSync(hotelId: string, accountId: string, lastSyncAt: Date, error?: string | null): Promise<void>;

  // Mappings
  createMapping(hotelId: string, input: CreateMappingInput): Promise<ChannelRoomMapping>;
  listMappings(hotelId: string, accountId?: string): Promise<ChannelRoomMapping[]>;
  setMappingActive(hotelId: string, mappingId: string, isActive: boolean): Promise<void>;
  getMappingsForAccount(hotelId: string, accountId: string): Promise<ChannelRoomMapping[]>;

  // Jobs (file d'attente)
  enqueueJob(hotelId: string, input: { accountId: string; direction: "outbound" | "inbound"; type: SyncType; payload?: Record<string, unknown> | null; maxAttempts?: number }): Promise<ChannelSyncJob>;
  claimDueJobs(hotelId: string, now: Date, limit?: number): Promise<ChannelSyncJob[]>;
  markJobRunning(hotelId: string, jobId: string): Promise<void>;
  markJobSuccess(hotelId: string, jobId: string, result?: Record<string, unknown> | null): Promise<void>;
  markJobFailed(hotelId: string, jobId: string, error: string, retryAt?: Date | null): Promise<void>;
  markJobRetrying(hotelId: string, jobId: string, retryAt: Date, error: string): Promise<void>;
  getJob(hotelId: string, jobId: string): Promise<ChannelSyncJob | null>;
  listJobs(hotelId: string, status?: SyncJobStatus, limit?: number): Promise<ChannelSyncJob[]>;

  // Logs
  writeLog(hotelId: string, input: { accountId: string; jobId?: string | null; level?: string; message: string; detail?: Record<string, unknown> | null }): Promise<ChannelSyncLog>;
  listLogs(hotelId: string, accountId?: string, limit?: number): Promise<ChannelSyncLog[]>;

  // Tarifs
  recordRateOverride(hotelId: string, input: { accountId: string; roomTypeId: string; ratePlanId?: string | null; date: Date; price: number; currency?: string; status?: string }): Promise<ChannelRateOverride>;

  // Statistiques
  syncStats(hotelId: string, accountId?: string): Promise<{ totalJobs: number; success: number; failed: number; pending: number; logs: number }>;
  getAccountForSync(hotelId: string, accountId: string): Promise<ChannelAccount | null>;
}
