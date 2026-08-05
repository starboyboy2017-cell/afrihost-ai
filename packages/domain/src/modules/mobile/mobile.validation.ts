/**
 * Module 31 — Plateforme Mobile : validation (zod).
 */
import { z } from "zod";
import type { RegisterDeviceInput, RegisterPushTokenInput, SyncOperation } from "./mobile.types.js";

export const registerDeviceSchema = z.object({
  installId: z.string().trim().min(1, "InstallId requis"),
  deviceName: z.string().trim().optional().nullable(),
  platform: z.string().trim().optional().nullable(),
  userId: z.string().min(1).optional().nullable(),
  guestId: z.string().min(1).optional().nullable(),
}).strict();

export const registerPushTokenSchema = z.object({
  deviceId: z.string().min(1).optional().nullable(),
  platform: z.string().trim().optional().nullable(),
  token: z.string().trim().min(1, "Token requis"),
  userId: z.string().min(1).optional().nullable(),
  guestId: z.string().min(1).optional().nullable(),
}).strict();

export const syncOperationSchema = z.object({
  entityType: z.string().trim().min(1),
  entityId: z.string().min(1),
  operation: z.enum(["CREATE", "UPDATE", "DELETE"]),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export function validateRegisterDevice(input: RegisterDeviceInput): RegisterDeviceInput {
  return registerDeviceSchema.parse(input) as RegisterDeviceInput;
}
export function validateRegisterPushToken(input: RegisterPushTokenInput): RegisterPushTokenInput {
  return registerPushTokenSchema.parse(input) as RegisterPushTokenInput;
}
export function validateSyncOperation(input: SyncOperation): SyncOperation {
  return syncOperationSchema.parse(input) as SyncOperation;
}
