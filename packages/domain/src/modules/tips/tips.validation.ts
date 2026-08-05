/**
 * Module 16 — Pourboires : validation (zod).
 */

import { z } from "zod";
import type { CreateTipInput, CreateTipRuleInput } from "./tips.types.js";

const typeEnum = ["INDIVIDUAL", "COLLECTIVE"] as const;
const statusEnum = ["PENDING", "VALIDATED", "DISTRIBUTED", "CANCELLED"] as const;
const methodEnum = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE", "POS_TERMINAL"] as const;

export const createTipRuleSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  serverPercent: z.number().int().min(0).max(100).default(60),
  teamPercent: z.number().int().min(0).max(100).default(30),
  kitchenPercent: z.number().int().min(0).max(100).default(10),
  otherPercent: z.number().int().min(0).max(100).default(0),
}).strict()
  .refine((d) => d.serverPercent + d.teamPercent + d.kitchenPercent + d.otherPercent === 100, {
    message: "La somme des pourcentages doit être 100",
  });

export const createTipSchema = z.object({
  posPaymentId: z.string().min(1).optional().nullable(),
  posOrderId: z.string().min(1).optional().nullable(),
  type: z.enum(typeEnum),
  amount: z.number().int().min(1, "Montant invalide"),
  method: z.enum(methodEnum),
  recipient: z.string().min(1).optional().nullable(),
  tipRuleId: z.string().min(1).optional().nullable(),
  note: z.string().trim().optional().nullable(),
}).strict()
  .refine((d) => !(d.type === "INDIVIDUAL" && !d.recipient), {
    message: "Un pourboire individuel exige un bénéficiaire",
  })
  .refine((d) => !(d.type === "COLLECTIVE" && !d.tipRuleId), {
    message: "Un pourboire collectif exige une règle de répartition",
  });

export const tipStatusSchema = z.enum(statusEnum);

export function validateCreateTipRule(input: CreateTipRuleInput): CreateTipRuleInput {
  return createTipRuleSchema.parse(input) as CreateTipRuleInput;
}
export function validateCreateTip(input: CreateTipInput): CreateTipInput {
  return createTipSchema.parse(input) as CreateTipInput;
}
export function validateTipStatus(status: string): TipStatus {
  return tipStatusSchema.parse(status);
}
type TipStatus = (typeof statusEnum)[number];
