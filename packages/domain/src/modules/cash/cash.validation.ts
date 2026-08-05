/**
 * Module 15 — Caisse : validation (zod).
 */

import { z } from "zod";
import type { CashMovementInput, CloseSessionInput, CreateCashRegisterInput, OpenSessionInput } from "./cash.types.js";

const movementTypeEnum = ["OPENING", "SALE", "PAYMENT", "REFUND", "VOID", "EXPENSE", "CLOSING", "RECONCILIATION"] as const;
const methodEnum = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE", "POS_TERMINAL"] as const;

export const createCashRegisterSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  posPointId: z.string().min(1).optional().nullable(),
}).strict();

export const openSessionSchema = z.object({
  registerId: z.string().min(1),
  openingAmount: z.number().int().min(0).default(0),
  cashierId: z.string().min(1).optional().nullable(),
  note: z.string().trim().optional().nullable(),
}).strict();

export const cashMovementSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(movementTypeEnum),
  method: z.enum(methodEnum),
  amount: z.number().int().min(0),
  reference: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
}).strict();

export const closeSessionSchema = z.object({
  sessionId: z.string().min(1),
  countedAmount: z.number().int().min(0),
  note: z.string().trim().optional().nullable(),
}).strict();

export function validateCreateCashRegister(input: CreateCashRegisterInput): CreateCashRegisterInput {
  return createCashRegisterSchema.parse(input) as CreateCashRegisterInput;
}
export function validateOpenSession(input: OpenSessionInput): OpenSessionInput {
  return openSessionSchema.parse(input) as OpenSessionInput;
}
export function validateCashMovement(input: CashMovementInput): CashMovementInput {
  return cashMovementSchema.parse(input) as CashMovementInput;
}
export function validateCloseSession(input: CloseSessionInput): CloseSessionInput {
  return closeSessionSchema.parse(input) as CloseSessionInput;
}
