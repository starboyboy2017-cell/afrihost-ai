/**
 * Module 21 — CRM : validation (zod).
 */

import { z } from "zod";
import type {
  CreateCampaignInput,
  CreateCompanyInput,
  CreateInteractionInput,
  CreateOpportunityInput,
  CreateSegmentInput,
  CreateTaskInput,
  SavePreferenceInput,
} from "./crm.types.js";

const channelEnum = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "OTHER"] as const;
const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  type: z.string().trim().min(1, "Type requis"),
  contact: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
}).strict();

export const savePreferenceSchema = z.object({
  guestId: z.string().min(1),
  language: z.string().trim().optional().nullable(),
  roomTypeId: z.string().min(1).optional().nullable(),
  floor: z.string().trim().optional().nullable(),
  view: z.string().trim().optional().nullable(),
  bedType: z.string().trim().optional().nullable(),
  diet: z.string().trim().optional().nullable(),
  allergies: z.array(z.string()).optional(),
  favoritePaymentMethod: z.string().trim().optional().nullable(),
  birthDate: dateCoerce.optional().nullable(),
  communicationPrefs: z.record(z.string(), z.unknown()).optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const createSegmentSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  description: z.string().trim().optional().nullable(),
  criteria: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  channel: z.enum(channelEnum),
  segmentId: z.string().min(1).optional().nullable(),
  subject: z.string().trim().optional().nullable(),
  messageTemplate: z.string().trim().min(1, "Message requis"),
  scheduledAt: dateCoerce.optional().nullable(),
}).strict();

export const createInteractionSchema = z.object({
  guestId: z.string().min(1),
  type: z.string().trim().min(1, "Type requis"),
  summary: z.string().trim().min(1, "Résumé requis"),
  detail: z.record(z.string(), z.unknown()).optional(),
  sourceModule: z.string().trim().optional().nullable(),
}).strict();

export const createTaskSchema = z.object({
  guestId: z.string().min(1),
  kind: z.enum(["NOTE", "TASK", "REMINDER"]),
  title: z.string().trim().min(1, "Titre requis"),
  body: z.string().trim().optional().nullable(),
  dueAt: dateCoerce.optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
}).strict();

export const createOpportunitySchema = z.object({
  guestId: z.string().min(1).optional().nullable(),
  companyId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(1, "Titre requis"),
  value: z.number().int().min(0).optional().nullable(),
  stage: z.string().trim().default("PROSPECT"),
  expectedDate: dateCoerce.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
}).strict();

export function validateCreateCompany(input: CreateCompanyInput): CreateCompanyInput {
  return createCompanySchema.parse(input) as CreateCompanyInput;
}
export function validateSavePreference(input: SavePreferenceInput): SavePreferenceInput {
  return savePreferenceSchema.parse(input) as SavePreferenceInput;
}
export function validateCreateSegment(input: CreateSegmentInput): CreateSegmentInput {
  return createSegmentSchema.parse(input) as CreateSegmentInput;
}
export function validateCreateCampaign(input: CreateCampaignInput): CreateCampaignInput {
  return createCampaignSchema.parse(input) as CreateCampaignInput;
}
export function validateCreateInteraction(input: CreateInteractionInput): CreateInteractionInput {
  return createInteractionSchema.parse(input) as CreateInteractionInput;
}
export function validateCreateCustomerTask(input: CreateTaskInput): CreateTaskInput {
  return createTaskSchema.parse(input) as CreateTaskInput;
}
export function validateCreateOpportunity(input: CreateOpportunityInput): CreateOpportunityInput {
  return createOpportunitySchema.parse(input) as CreateOpportunityInput;
}
