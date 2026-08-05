/**
 * Module 12 — Transport : validation (zod).
 */

import { z } from "zod";
import type { CreateDriverInput, CreateTransferInput, CreateVehicleInput } from "./transport.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" });
const statusEnum = ["REQUESTED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const ownershipEnum = ["INTERNAL", "EXTERNAL"] as const;
const vehicleStatusEnum = ["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"] as const;
const typeEnum = ["AIRPORT", "STATION", "CITY", "CUSTOM", "ROUND_TRIP", "MULTI_STOP"] as const;

export const createVehicleSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  plate: z.string().trim().min(1, "Plaque requise"),
  capacity: z.number().int().min(1).default(4),
  ownership: z.enum(ownershipEnum).default("INTERNAL"),
  providerName: z.string().trim().optional().nullable(),
  status: z.enum(vehicleStatusEnum).default("AVAILABLE"),
}).strict();

export const createDriverSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  phone: z.string().trim().optional().nullable(),
  licenseNo: z.string().trim().optional().nullable(),
}).strict();

export const createTransferSchema = z.object({
  guestId: z.string().min(1).optional().nullable(),
  reservationId: z.string().min(1).optional().nullable(),
  type: z.enum(typeEnum),
  pickupLocation: z.string().trim().min(1, "Lieu de prise en charge requis"),
  dropoffLocation: z.string().trim().min(1, "Lieu de destination requis"),
  scheduledAt: dateCoerce,
  paxCount: z.number().int().min(1).default(1),
  notes: z.string().trim().optional().nullable(),
  amount: z.number().int().min(0).default(0),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
}).strict();

export const transferStatusSchema = z.enum(statusEnum);

export function validateCreateVehicle(input: CreateVehicleInput): CreateVehicleInput {
  return createVehicleSchema.parse(input) as CreateVehicleInput;
}
export function validateCreateDriver(input: CreateDriverInput): CreateDriverInput {
  return createDriverSchema.parse(input) as CreateDriverInput;
}
export function validateCreateTransfer(input: CreateTransferInput): CreateTransferInput {
  return createTransferSchema.parse(input) as CreateTransferInput;
}
export function validateTransferStatus(status: string): TransferStatus {
  return transferStatusSchema.parse(status);
}
type TransferStatus = (typeof statusEnum)[number];
