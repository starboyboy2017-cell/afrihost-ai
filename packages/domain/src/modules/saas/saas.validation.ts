/**
 * Module 32 — Billing SaaS : validation (zod).
 */
import { z } from "zod";
import type {
  CreateCouponInput,
  CreateManualPaymentInput,
  CreatePaymentMethodInput,
  CreatePlanInput,
  CreateSubscriptionInput,
  ReviewManualPaymentInput,
} from "./saas.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" }).optional().nullable();

export const createPlanSchema = z.object({
  code: z.string().trim().min(1, "Code requis"),
  name: z.string().trim().min(1, "Nom requis"),
  description: z.string().trim().optional().nullable(),
  price: z.number().int().min(0).optional(),
  currency: z.string().trim().default("XOF"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]).default("MONTHLY"),
  trialDays: z.number().int().min(0).optional(),
  maxUsers: z.number().int().min(0).optional(),
  maxHotels: z.number().int().min(0).optional(),
  maxRooms: z.number().int().min(0).optional(),
  quotaAi: z.number().int().min(0).optional(),
  quotaEmail: z.number().int().min(0).optional(),
  quotaSms: z.number().int().min(0).optional(),
  quotaWhatsapp: z.number().int().min(0).optional(),
  quotaApi: z.number().int().min(0).optional(),
  modules: z.array(z.string()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  allowedPaymentMethods: z.array(z.string()).optional(),
  allowedCountries: z.array(z.string()).optional(),
}).strict();

export const createSubscriptionSchema = z.object({
  organisationId: z.string().min(1),
  hotelId: z.string().min(1).optional().nullable(),
  planCode: z.string().min(1),
  billingCycle: z.string().trim().optional(),
  couponCode: z.string().trim().optional().nullable(),
}).strict();

export const createManualPaymentSchema = z.object({
  organisationId: z.string().min(1),
  hotelId: z.string().min(1).optional().nullable(),
  subscriptionId: z.string().min(1),
  methodKey: z.string().min(1),
  amount: z.number().int().min(0),
  currency: z.string().trim().min(1),
  proofType: z.string().trim().optional().nullable(),
  proofUrl: z.string().trim().optional().nullable(),
  bankRef: z.string().trim().optional().nullable(),
  comment: z.string().trim().optional().nullable(),
}).strict();

export const reviewManualPaymentSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "NEEDS_PROOF"]),
  comment: z.string().trim().optional().nullable(),
}).strict();

export const createPaymentMethodSchema = z.object({
  methodKey: z.string().trim().min(1, "Clé requise"),
  name: z.string().trim().min(1, "Nom requis"),
  type: z.enum(["AUTO", "MANUAL"]).default("AUTO"),
  countries: z.array(z.string()).optional(),
  currencies: z.array(z.string()).optional(),
  plans: z.array(z.string()).optional(),
  hotelIds: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const createCouponSchema = z.object({
  code: z.string().trim().min(1, "Code requis"),
  type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  value: z.number().int().min(0),
  maxUses: z.number().int().min(1).optional().nullable(),
  planCodes: z.array(z.string()).optional(),
  expiresAt: dateCoerce,
}).strict();

export function validateCreatePlan(input: CreatePlanInput): CreatePlanInput { return createPlanSchema.parse(input) as CreatePlanInput; }
export function validateCreateSubscription(input: CreateSubscriptionInput): CreateSubscriptionInput { return createSubscriptionSchema.parse(input) as CreateSubscriptionInput; }
export function validateCreateManualPayment(input: CreateManualPaymentInput): CreateManualPaymentInput { return createManualPaymentSchema.parse(input) as CreateManualPaymentInput; }
export function validateReviewManualPayment(input: ReviewManualPaymentInput): ReviewManualPaymentInput { return reviewManualPaymentSchema.parse(input) as ReviewManualPaymentInput; }
export function validateCreatePaymentMethod(input: CreatePaymentMethodInput): CreatePaymentMethodInput { return createPaymentMethodSchema.parse(input) as CreatePaymentMethodInput; }
export function validateCreateCoupon(input: CreateCouponInput): CreateCouponInput { return createCouponSchema.parse(input) as CreateCouponInput; }
