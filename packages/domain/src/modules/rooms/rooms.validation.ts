/**
 * Module 6 — Chambres : validation (zod).
 * Règles : numéro de chambre requis (unique par hôtel), type de chambre requis,
 * étage >= 0.
 */

import { z } from "zod";
import type { CreateRoomInput, UpdateRoomInput } from "./rooms.types.js";

const statusEnum = [
  "AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY",
  "CLEANING", "INSPECTED", "OUT_OF_ORDER", "OUT_OF_SERVICE",
] as const;

export const createRoomSchema = z
  .object({
    roomTypeId: z.string().min(1, "Type de chambre requis"),
    number: z.string().trim().min(1, "Numéro de chambre requis"),
    floor: z.number().int().min(0).nullable().optional(),
    keyCardEnabled: z.boolean().optional(),
    photos: z.array(z.string()).optional(),
    initialStatus: z.enum(statusEnum).default("AVAILABLE"),
  })
  .strict();

export const updateRoomSchema = z
  .object({
    roomTypeId: z.string().min(1).optional(),
    floor: z.number().int().min(0).nullable().optional(),
    keyCardEnabled: z.boolean().optional(),
    photos: z.array(z.string()).optional(),
  })
  .strict();

export function validateCreateRoom(input: CreateRoomInput): CreateRoomInput {
  return createRoomSchema.parse(input) as CreateRoomInput;
}
export function validateUpdateRoom(input: UpdateRoomInput): UpdateRoomInput {
  return updateRoomSchema.parse(input) as UpdateRoomInput;
}
