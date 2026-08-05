/**
 * Module 25 — Channel Manager / OTA : validation (zod).
 */
import { z } from "zod";
import type {
  CreateChannelAccountInput,
  CreateMappingInput,
  ProcessBookingInput,
  PushAvailabilityInput,
  PushRatesInput,
  PushRestrictionsInput,
} from "./channel.types.js";

const json = z.record(z.string(), z.unknown()).optional();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format YYYY-MM-DD requise");

export const createChannelAccountSchema = z.object({
  otaKey: z.string().trim().min(1, "Clé OTA requise"),
  name: z.string().trim().min(1, "Nom requis"),
  credentials: json,
  config: json,
}).strict();

export const createMappingSchema = z.object({
  accountId: z.string().min(1),
  roomTypeId: z.string().min(1),
  otaRoomId: z.string().min(1, "Identifiant chambre OTA requis"),
  otaRoomName: z.string().trim().optional().nullable(),
}).strict();

export const pushAvailabilitySchema = z.object({
  accountId: z.string().min(1),
  updates: z.array(z.object({
    date: dateStr,
    rooms: z.number().int().min(0),
  })).min(1),
}).strict();

export const pushRatesSchema = z.object({
  accountId: z.string().min(1),
  updates: z.array(z.object({
    date: dateStr,
    roomTypeId: z.string().min(1),
    ratePlanId: z.string().optional().nullable(),
    price: z.number().int().min(0),
    currency: z.string().optional(),
  })).min(1),
}).strict();

export const pushRestrictionsSchema = z.object({
  accountId: z.string().min(1),
  updates: z.array(z.object({
    date: dateStr,
    roomTypeId: z.string().min(1),
    minStay: z.number().int().min(0).optional().nullable(),
    maxStay: z.number().int().min(0).optional().nullable(),
    closedToArrival: z.boolean().optional().nullable(),
    closedToDeparture: z.boolean().optional().nullable(),
    stopSell: z.boolean().optional().nullable(),
  })).min(1),
}).strict();

export const processBookingSchema = z.object({
  accountId: z.string().min(1),
  booking: z.object({
    otaKey: z.string().min(1),
    otaBookingId: z.string().min(1),
    guestName: z.string().trim().min(1),
    guestEmail: z.string().email().optional().nullable(),
    roomTypeId: z.string().min(1),
    arrivalDate: z.string().min(1),
    departureDate: z.string().min(1),
    adults: z.number().int().min(0).optional(),
    children: z.number().int().min(0).optional(),
    amount: z.number().int().min(0).optional(),
    currency: z.string().optional(),
    status: z.string().optional(),
  }),
}).strict();

export function validateCreateChannelAccount(input: CreateChannelAccountInput): CreateChannelAccountInput {
  return createChannelAccountSchema.parse(input) as CreateChannelAccountInput;
}
export function validateCreateMapping(input: CreateMappingInput): CreateMappingInput {
  return createMappingSchema.parse(input) as CreateMappingInput;
}
export function validatePushAvailability(input: PushAvailabilityInput): PushAvailabilityInput {
  return pushAvailabilitySchema.parse(input) as PushAvailabilityInput;
}
export function validatePushRates(input: PushRatesInput): PushRatesInput {
  return pushRatesSchema.parse(input) as PushRatesInput;
}
export function validatePushRestrictions(input: PushRestrictionsInput): PushRestrictionsInput {
  return pushRestrictionsSchema.parse(input) as PushRestrictionsInput;
}
export function validateProcessBooking(input: ProcessBookingInput): ProcessBookingInput {
  return processBookingSchema.parse(input) as ProcessBookingInput;
}
