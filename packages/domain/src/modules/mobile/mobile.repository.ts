/**
 * Module 31 — Plateforme Mobile : port de persistance.
 */
import type { MobileDevice, MobileSyncLog, PushToken, RegisterDeviceInput, RegisterPushTokenInput, SyncOperation } from "./mobile.types.js";

export interface MobileRepository {
  // Appareils
  registerDevice(hotelId: string, input: RegisterDeviceInput): Promise<MobileDevice>;
  listDevices(hotelId: string): Promise<MobileDevice[]>;
  setDeviceActive(hotelId: string, deviceId: string, isActive: boolean): Promise<void>;
  touchDevice(hotelId: string, installId: string): Promise<void>;

  // Push
  registerPushToken(hotelId: string, input: RegisterPushTokenInput): Promise<PushToken>;
  listPushTokens(hotelId: string): Promise<PushToken[]>;
  revokePushToken(hotelId: string, token: string): Promise<void>;

  // Sync offline
  recordSyncOperation(hotelId: string, input: SyncOperation): Promise<MobileSyncLog>;
  listPendingSync(hotelId: string): Promise<MobileSyncLog[]>;
  markSyncSynced(hotelId: string, syncId: string): Promise<void>;
  markSyncFailed(hotelId: string, syncId: string, error: string): Promise<void>;

  // Données du tableau de bord mobile
  countAlerts(hotelId: string): Promise<number>;
  countPendingTasks(hotelId: string): Promise<number>;
  occupancyRate(hotelId: string): Promise<number>;
  countCheckinsToday(hotelId: string): Promise<number>;
  countCheckoutsToday(hotelId: string): Promise<number>;
  countPendingSync(hotelId: string): Promise<number>;
}
