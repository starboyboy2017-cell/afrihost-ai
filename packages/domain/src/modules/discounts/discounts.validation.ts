/**
 * Module 17 — Remises : validation (zod).
 */

import { z } from "zod";
import type { CreateDiscountRuleInput, GenerateCouponInput } from "./discounts.types.js";

const typeEnum = ["PERCENT", "FIXED"] as const;
const scopeEnum = ["POS", "RESERVATION", "BILLING"] as const;
const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createDiscountRuleSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  code: z.string().trim().optional().nullable(),
  type: z.enum(typeEnum),
  value: z.number().int().min(1, "Valeur requise"),
  scope: z.enum(scopeEnum).default("POS"),
  roleCap: z.number().int().min(0).optional().nullable(),
  conditions: z.object({
    dateFrom: dateCoerce.optional(),
    dateTo: dateCoerce.optional(),
    channels: z.array(z.string()).optional(),
    guestTypes: z.array(z.string()).optional(),
    roomTypeIds: z.array(z.string()).optional(),
    minAmount: z.number().int().min(0).optional(),
    maxAmount: z.number().int().min(0).optional(),
  }).optional().nullable(),
}).strict()
  .refine((d) => !(d.type === "PERCENT" && d.value > 100), { message: "Un pourcentage ne peut dépasser 100" });

export const generateCouponSchema = z.object({
  ruleId: z.string().min(1),
  singleUse: z.boolean().default(false),
  expiresAt: dateCoerce.optional().nullable(),
  issuedTo: z.string().min(1).optional().nullable(),
}).strict();

export function validateCreateRule(input: CreateDiscountRuleInput): CreateDiscountRuleInput {
  return createDiscountRuleSchema.parse(input) as CreateDiscountRuleInput;
}
export function validateGenerateCoupon(input: GenerateCouponInput): GenerateCouponInput {
  return generateCouponSchema.parse(input) as GenerateCouponInput;
}
