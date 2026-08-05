/**
 * Module 5 — Types de chambres & tarifs : validation (zod).
 */

import { z } from "zod";
import type {
  CreateRatePlanInput,
  CreateRoomTypeInput,
  UpdateRatePlanInput,
  UpdateRoomTypeInput,
} from "./roomTypes.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" });
const currencyRegex = /^[A-Z]{3}$/;

export const createRoomTypeSchema = z
  .object({
    name: z.string().trim().min(1, "Nom requis"),
    description: z.string().trim().optional().nullable(),
    baseRate: z.number().int().min(0, "Tarif invalide"),
    maxOccupancy: z.number().int().min(1).default(2),
    bedCount: z.number().int().min(1).default(1),
    amenities: z.array(z.string().trim()).optional(),
    features: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

export const updateRoomTypeSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
    baseRate: z.number().int().min(0).optional(),
    maxOccupancy: z.number().int().min(1).optional(),
    bedCount: z.number().int().min(1).optional(),
    amenities: z.array(z.string().trim()).optional(),
    features: z.record(z.string(), z.unknown()).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

const restrictionsSchema = z
  .object({
    minNights: z.number().int().min(1).optional().nullable(),
    maxNights: z.number().int().min(1).optional().nullable(),
    advanceBookingDays: z.number().int().min(1).optional().nullable(),
    minAdvanceBookingDays: z.number().int().min(1).optional().nullable(),
    maxGuests: z.number().int().min(1).optional().nullable(),
  })
  .strict();

const pricesSchema = z.record(z.string().regex(currencyRegex), z.number().int().min(0));

export const createRatePlanSchema = z
  .object({
    roomTypeId: z.string().min(1),
    name: z.string().trim().min(1, "Nom du plan requis"),
    type: z.enum(["BASE", "SEASONAL", "WEEKEND", "PROMOTIONAL"]).default("BASE"),
    startDate: dateCoerce.optional().nullable(),
    endDate: dateCoerce.optional().nullable(),
    prices: pricesSchema.optional(),
    restrictions: restrictionsSchema.optional(),
  })
  .strict()
  .refine((d) => !(d.startDate && d.endDate) || d.endDate!.getTime() > d.startDate!.getTime(), {
    message: "endDate doit être après startDate",
    path: ["endDate"],
  });

export const updateRatePlanSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: z.enum(["BASE", "SEASONAL", "WEEKEND", "PROMOTIONAL"]).optional(),
    startDate: dateCoerce.optional().nullable(),
    endDate: dateCoerce.optional().nullable(),
    isActive: z.boolean().optional(),
    prices: pricesSchema.optional(),
    restrictions: restrictionsSchema.optional(),
  })
  .strict();

export function validateCreateRoomType(input: CreateRoomTypeInput): CreateRoomTypeInput {
  return createRoomTypeSchema.parse(input) as CreateRoomTypeInput;
}
export function validateUpdateRoomType(input: UpdateRoomTypeInput): UpdateRoomTypeInput {
  return updateRoomTypeSchema.parse(input) as UpdateRoomTypeInput;
}
export function validateCreateRatePlan(input: CreateRatePlanInput): CreateRatePlanInput {
  return createRatePlanSchema.parse(input) as CreateRatePlanInput;
}
export function validateUpdateRatePlan(input: UpdateRatePlanInput): UpdateRatePlanInput {
  return updateRatePlanSchema.parse(input) as UpdateRatePlanInput;
}
