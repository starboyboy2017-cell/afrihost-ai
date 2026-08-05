/**
 * Module 30 — API Publique & Marketplace : validation (zod).
 */
import { z } from "zod";
import type { CreateApiAppInput, CreateCredentialInput, PublishMarketplaceInput, RegisterWebhookInput } from "./publicapi.types.js";

export const createApiAppSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  description: z.string().trim().optional().nullable(),
  environment: z.enum(["SANDBOX", "PRODUCTION"]).optional(),
}).strict();

export const createCredentialSchema = z.object({
  appId: z.string().min(1),
  kind: z.enum(["API_KEY", "OAUTH2_CLIENT", "JWT"]).optional(),
  scopes: z.array(z.string()).optional(),
  hotels: z.array(z.string()).optional(),
  rateLimitPerMinute: z.number().int().min(1).optional(),
  // Remplis par le service (générés) — acceptés sans être validés.
  clientId: z.string().optional(),
  secretHash: z.string().optional(),
});

export const registerWebhookSchema = z.object({
  appId: z.string().min(1),
  hotelId: z.string().min(1).optional().nullable(),
  url: z.string().url("URL invalide"),
  events: z.array(z.string()).min(1),
}).strict();

export const publishMarketplaceSchema = z.object({
  appId: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis"),
  category: z.string().trim().min(1, "Catégorie requise"),
  summary: z.string().trim().optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
}).strict();

export function validateCreateApiApp(input: CreateApiAppInput): CreateApiAppInput {
  return createApiAppSchema.parse(input) as CreateApiAppInput;
}
export function validateCreateCredential(input: CreateCredentialInput): CreateCredentialInput {
  return createCredentialSchema.parse(input) as CreateCredentialInput;
}
export function validateRegisterWebhook(input: RegisterWebhookInput): RegisterWebhookInput {
  return registerWebhookSchema.parse(input) as RegisterWebhookInput;
}
export function validatePublishMarketplace(input: PublishMarketplaceInput): PublishMarketplaceInput {
  return publishMarketplaceSchema.parse(input) as PublishMarketplaceInput;
}
