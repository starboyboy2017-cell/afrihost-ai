/**
 * Module 11 — Blanchisserie : validation (zod).
 */

import { z } from "zod";
import type { CreateBatchInput, CreateItemInput, CreateItemTypeInput, CreateLossInput } from "./laundry.types.js";

const stateEnum = ["CLEAN", "DISTRIBUTED", "USED", "DIRTY", "WASHING", "DRYING", "IRONING"] as const;
const modeEnum = ["INTERNAL", "EXTERNAL"] as const;

export const createItemTypeSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  unit: z.string().trim().optional().nullable(),
}).strict();

export const createItemSchema = z.object({
  itemTypeId: z.string().min(1),
  code: z.string().trim().optional().nullable(),
}).strict();

export const createBatchSchema = z.object({
  mode: z.enum(modeEnum).default("INTERNAL"),
  providerName: z.string().trim().optional().nullable(),
  responsible: z.string().trim().optional().nullable(),
  cost: z.number().int().min(0).optional().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  itemIds: z.array(z.string().min(1)).optional(),
}).strict();

export const createLossSchema = z.object({
  itemId: z.string().min(1),
  reason: z.enum(["LOST", "DAMAGED"]),
  note: z.string().trim().optional().nullable(),
  costValue: z.number().int().min(0).optional().nullable(),
}).strict();

export const stateSchema = z.enum(stateEnum);

export function validateCreateItemType(input: CreateItemTypeInput): CreateItemTypeInput {
  return createItemTypeSchema.parse(input) as CreateItemTypeInput;
}
export function validateCreateItem(input: CreateItemInput): CreateItemInput {
  return createItemSchema.parse(input) as CreateItemInput;
}
export function validateCreateBatch(input: CreateBatchInput): CreateBatchInput {
  return createBatchSchema.parse(input) as CreateBatchInput;
}
export function validateCreateLoss(input: CreateLossInput): CreateLossInput {
  return createLossSchema.parse(input) as CreateLossInput;
}
export function validateLaundryState(state: string): LaundryState {
  return stateSchema.parse(state);
}
type LaundryState = (typeof stateEnum)[number];
