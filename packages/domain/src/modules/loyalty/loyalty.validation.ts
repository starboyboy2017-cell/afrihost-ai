/**
 * Module 22 — Programme de fidélité : validation (zod).
 */
import { z } from "zod";
import type {
  AdjustPointsInput,
  AwardPointsInput,
  CreateBonusInput,
  CreateProgramInput,
  CreateRewardInput,
  CreateRuleInput,
  CreateTierInput,
  EnrollInput,
  RedeemInput,
} from "./loyalty.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" });
const triggerEnum = [
  "night_earned",
  "spend_earned",
  "service_earned",
  "promotion",
  "campaign",
  "referral",
  "welcome",
  "birthday",
  "custom",
] as const;
const rewardTypeEnum = ["DISCOUNT", "FREE_NIGHT", "UPGRADE", "SERVICE", "VOUCHER"] as const;
const bonusTypeEnum = ["WELCOME", "BIRTHDAY", "REFERRAL", "CAMPAIGN", "OTHER"] as const;
const json = z.record(z.string(), z.unknown()).optional();

export const createProgramSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  scope: z.enum(["HOTEL", "GROUP"]).optional(),
  hotelIds: z.array(z.string().min(1)).optional(),
  description: z.string().trim().optional().nullable(),
  currency: z.string().trim().default("XOF"),
  pointsPerSpend: z.number().int().min(0).optional(),
  pointsPerNight: z.number().int().min(0).optional(),
  validityDays: z.number().int().min(1).optional(),
  startDate: dateCoerce.optional().nullable(),
  endDate: dateCoerce.optional().nullable(),
  config: json,
}).strict();

export const createTierSchema = z.object({
  code: z.string().trim().min(1, "Code requis"),
  name: z.string().trim().min(1, "Nom requis"),
  rank: z.number().int().min(0).optional(),
  minPoints: z.number().int().min(0).optional(),
  minStays: z.number().int().min(0).optional(),
  minSpend: z.number().int().min(0).optional(),
  benefits: json,
  accessRules: json,
  keepRules: json,
}).strict();

export const createRuleSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  trigger: z.enum(triggerEnum),
  condition: json,
  points: z.number().int().min(0).optional(),
  pointsPerUnit: z.number().min(0).optional(),
  multiplier: z.number().min(0).optional(),
  capPerEvent: z.number().int().min(0).optional().nullable(),
  priority: z.number().int().min(0).optional(),
}).strict();

export const createRewardSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  type: z.enum(rewardTypeEnum),
  pointsCost: z.number().int().min(1, "Coût en points requis"),
  value: z.number().min(0).optional(),
  description: z.string().trim().optional().nullable(),
  config: json,
  validityDays: z.number().int().min(1).optional(),
  stock: z.number().int().min(0).optional().nullable(),
}).strict();

export const createBonusSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  bonusType: z.enum(bonusTypeEnum),
  points: z.number().int().min(0),
  condition: json,
  startsAt: dateCoerce.optional().nullable(),
  endsAt: dateCoerce.optional().nullable(),
}).strict();

export const awardPointsSchema = z.object({
  guestId: z.string().min(1),
  trigger: z.enum(triggerEnum),
  context: z.record(z.string(), z.unknown()).optional(),
  reference: z.string().trim().optional(),
  sourceModule: z.string().trim().optional(),
}).strict();

export const redeemSchema = z.object({
  guestId: z.string().min(1),
  rewardId: z.string().min(1),
  reference: z.string().trim().optional(),
  metadata: json,
}).strict();

export const adjustPointsSchema = z.object({
  guestId: z.string().min(1),
  points: z.number().int("Points invalides"),
  reason: z.string().trim().min(1, "Motif requis"),
  reference: z.string().trim().optional(),
}).strict();

export const enrollSchema = z.object({
  guestId: z.string().min(1),
  programId: z.string().min(1),
}).strict();

export function validateCreateProgram(input: CreateProgramInput): CreateProgramInput {
  return createProgramSchema.parse(input) as CreateProgramInput;
}
export function validateCreateTier(input: CreateTierInput): CreateTierInput {
  return createTierSchema.parse(input) as CreateTierInput;
}
export function validateCreateLoyaltyRule(input: CreateRuleInput): CreateRuleInput {
  return createRuleSchema.parse(input) as CreateRuleInput;
}
export function validateCreateReward(input: CreateRewardInput): CreateRewardInput {
  return createRewardSchema.parse(input) as CreateRewardInput;
}
export function validateCreateBonus(input: CreateBonusInput): CreateBonusInput {
  return createBonusSchema.parse(input) as CreateBonusInput;
}
export function validateAwardPoints(input: AwardPointsInput): AwardPointsInput {
  return awardPointsSchema.parse(input) as AwardPointsInput;
}
export function validateRedeem(input: RedeemInput): RedeemInput {
  return redeemSchema.parse(input) as RedeemInput;
}
export function validateAdjustPoints(input: AdjustPointsInput): AdjustPointsInput {
  return adjustPointsSchema.parse(input) as AdjustPointsInput;
}
export function validateEnroll(input: EnrollInput): EnrollInput {
  return enrollSchema.parse(input) as EnrollInput;
}
