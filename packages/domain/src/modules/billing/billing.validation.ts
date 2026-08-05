/**
 * Module 20 — Paiements & facturation : validation (zod).
 */

import { z } from "zod";
import type { AddFolioLineInput, BillingPaymentInput, CreateFolioInput, CreateGatewayInput } from "./billing.types.js";

const chargeTypeEnum = ["ROOM", "RESTAURANT", "ROOM_SERVICE", "LAUNDRY", "TRANSPORT", "MAINTENANCE", "MINIBAR", "OTHER"] as const;
const methodEnum = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE", "POS_TERMINAL"] as const;
const kindEnum = ["PARTIAL", "DEPOSIT", "CAUTION", "FULL", "DEFERRED"] as const;

export const createFolioSchema = z.object({
  guestId: z.string().min(1),
  reservationId: z.string().min(1).optional().nullable(),
  name: z.string().trim().optional().nullable(),
  groupRef: z.string().trim().optional().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
}).strict();

export const addFolioLineSchema = z.object({
  folioId: z.string().min(1),
  chargeType: z.enum(chargeTypeEnum),
  description: z.string().trim().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().int().min(0),
  taxRate: z.number().min(0).max(1).optional(),
  sourceRef: z.string().trim().optional().nullable(),
}).strict();

export const billingPaymentSchema = z.object({
  folioId: z.string().min(1),
  amount: z.number().int().min(1),
  method: z.enum(methodEnum),
  kind: z.enum(kindEnum).default("FULL"),
  invoiceId: z.string().min(1).optional().nullable(),
  gatewayId: z.string().min(1).optional().nullable(),
  reference: z.string().trim().optional().nullable(),
}).strict();

export const createGatewaySchema = z.object({
  name: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
}).strict();

export function validateCreateFolio(input: CreateFolioInput): CreateFolioInput {
  return createFolioSchema.parse(input) as CreateFolioInput;
}
export function validateAddFolioLine(input: AddFolioLineInput): AddFolioLineInput {
  return addFolioLineSchema.parse(input) as AddFolioLineInput;
}
export function validateBillingPayment(input: BillingPaymentInput): BillingPaymentInput {
  return billingPaymentSchema.parse(input) as BillingPaymentInput;
}
export function validateCreateGateway(input: CreateGatewayInput): CreateGatewayInput {
  return createGatewaySchema.parse(input) as CreateGatewayInput;
}
