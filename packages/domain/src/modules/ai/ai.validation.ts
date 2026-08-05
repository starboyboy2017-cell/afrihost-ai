/**
 * Module 24 — IA : validation (zod).
 */
import { z } from "zod";
import type { AssistantQueryInput, CreateAiProviderInput, SetFeatureInput } from "./ai.types.js";

const json = z.record(z.string(), z.unknown()).optional();

export const createAiProviderSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  providerKey: z.string().trim().min(1, "Clé fournisseur requise"),
  baseUrl: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
  credentials: json,
  config: json,
  isDefault: z.boolean().optional(),
}).strict();

export const setFeatureSchema = z.object({
  feature: z.string().trim().min(1, "Fonctionnalité requise"),
  isEnabled: z.boolean(),
  config: json,
  quotaPerDay: z.number().int().min(0).optional(),
}).strict();

export const assistantQuerySchema = z.object({
  feature: z.string().trim().min(1, "Fonctionnalité requise"),
  prompt: z.string().trim().min(1, "Question requise").max(8000),
  context: json,
}).strict();

export function validateCreateAiProvider(input: CreateAiProviderInput): CreateAiProviderInput {
  return createAiProviderSchema.parse(input) as CreateAiProviderInput;
}
export function validateSetFeature(input: SetFeatureInput): SetFeatureInput {
  return setFeatureSchema.parse(input) as SetFeatureInput;
}
export function validateAssistantQuery(input: AssistantQueryInput): AssistantQueryInput {
  return assistantQuerySchema.parse(input) as AssistantQueryInput;
}
