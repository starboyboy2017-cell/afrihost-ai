/**
 * Module 13 — POS : validation (zod).
 */

import { z } from "zod";
import type { CreateMenuLineInput, CreatePosOrderInput, CreatePosPointInput, PosPaymentInput } from "./pos.types.js";

const statusEnum = ["OPEN", "PAID", "VOID", "REFUNDED", "CANCELLED"] as const;
const kindEnum = ["RESTAURANT", "BAR", "ROOM_SERVICE"] as const;
const methodEnum = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE", "POS_TERMINAL"] as const;

export const createPosPointSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  kind: z.enum(kindEnum).default("RESTAURANT"),
}).strict();

export const createMenuLineSchema = z.object({
  productId: z.string().min(1),
  price: z.number().int().min(0),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  taxRate: z.number().min(0).max(1).optional(),
}).strict();

export const createPosOrderSchema = z.object({
  posPointId: z.string().min(1),
  reservationId: z.string().min(1).optional().nullable(),
  roomId: z.string().min(1).optional().nullable(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
  })).min(1, "Commande vide"),
  discountAmount: z.number().int().min(0).default(0),
}).strict();

export const posPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().int().min(0),
  method: z.enum(methodEnum),
  reference: z.string().trim().optional().nullable(),
}).strict();

export const posStatusSchema = z.enum(statusEnum);

export function validateCreatePosPoint(input: CreatePosPointInput): CreatePosPointInput {
  return createPosPointSchema.parse(input) as CreatePosPointInput;
}
export function validateCreateMenuLine(input: CreateMenuLineInput): CreateMenuLineInput {
  return createMenuLineSchema.parse(input) as CreateMenuLineInput;
}
export function validateCreatePosOrder(input: CreatePosOrderInput): CreatePosOrderInput {
  return createPosOrderSchema.parse(input) as CreatePosOrderInput;
}
export function validatePosPayment(input: PosPaymentInput): PosPaymentInput {
  return posPaymentSchema.parse(input) as PosPaymentInput;
}
export function validatePosStatus(status: string): PosOrderStatus {
  return posStatusSchema.parse(status);
}
type PosOrderStatus = (typeof statusEnum)[number];
