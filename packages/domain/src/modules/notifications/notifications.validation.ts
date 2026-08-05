/**
 * Module 23 — Notifications multicanales : validation (zod).
 */
import { z } from "zod";
import type {
  CreateNotificationCampaignInput,
  CreateProviderInput,
  CreateTemplateInput,
  CreateTriggerInput,
  NotificationEventInput,
  SendNotificationInput,
} from "./notifications.types.js";

const channelEnum = ["WHATSAPP", "EMAIL", "SMS", "PUSH", "VOICE", "IN_APP", "OTHER"] as const;
const providerTypeEnum = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "VOICE", "OTHER"] as const;
const eventTypeEnum = [
  "RESERVATION_CONFIRMED", "RESERVATION_CANCELLED", "RESERVATION_CREATED",
  "CHECK_IN", "CHECK_OUT", "NO_SHOW",
  "PAYMENT_RECEIVED", "INVOICE_PAID",
  "PROMOTION", "LOYALTY_POINTS", "LOYALTY_TIER",
  "HOUSEKEEPING", "MAINTENANCE", "TRANSPORT", "LAUNDRY",
  "WELCOME", "CUSTOM",
] as const;
const priorityEnum = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const dateCoerce = z.coerce.date({ message: "Date invalide" });
const json = z.record(z.string(), z.unknown()).optional();

export const createProviderSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  channel: z.enum(channelEnum),
  providerType: z.enum(providerTypeEnum),
  providerKey: z.string().trim().min(1, "Clé fournisseur requise"),
  credentials: json,
  config: json,
  fromAddress: z.string().trim().optional().nullable(),
  domain: z.string().trim().optional().nullable(),
  replyTo: z.string().trim().optional().nullable(),
  isDefault: z.boolean().optional(),
  rateLimitPerMinute: z.number().int().min(0).optional(),
}).strict();

export const createTemplateSchema = z.object({
  channel: z.enum(channelEnum),
  eventType: z.enum(eventTypeEnum),
  code: z.string().trim().min(1, "Code requis"),
  locale: z.string().trim().default("fr"),
  subject: z.string().trim().optional().nullable(),
  body: z.string().trim().min(1, "Corps requis"),
  variables: z.array(z.string()).optional(),
}).strict();

export const createTriggerSchema = z.object({
  eventType: z.enum(eventTypeEnum),
  channel: z.enum(channelEnum),
  templateCode: z.string().trim().min(1, "Template requis"),
  condition: json,
  priority: z.enum(priorityEnum).optional(),
}).strict();

export const createNotificationCampaignSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  channel: z.enum(channelEnum),
  templateCode: z.string().trim().min(1, "Template requis"),
  segmentId: z.string().min(1).optional().nullable(),
  audience: json,
  scheduleAt: dateCoerce.optional().nullable(),
  config: json,
}).strict();

export const sendNotificationSchema = z.object({
  channel: z.enum(channelEnum),
  templateCode: z.string().trim().min(1, "Template requis"),
  eventType: z.enum(eventTypeEnum).optional(),
  recipient: z.object({
    recipientType: z.string().trim().min(1),
    recipientId: z.string().min(1),
    recipient: z.string().trim().optional().nullable(),
  }),
  vars: json,
  providerId: z.string().min(1).optional().nullable(),
  scheduleAt: dateCoerce.optional().nullable(),
  priority: z.enum(priorityEnum).optional(),
  payload: json,
}).strict();

export const notificationEventSchema = z.object({
  hotelId: z.string().min(1),
  organisationId: z.string().min(1),
  eventType: z.enum(eventTypeEnum),
  recipient: z.object({
    recipientType: z.string().trim().min(1),
    recipientId: z.string().min(1),
    recipient: z.string().trim().optional().nullable(),
  }),
  vars: json,
  reference: z.string().trim().optional(),
}).strict();

export function validateCreateProvider(input: CreateProviderInput): CreateProviderInput {
  return createProviderSchema.parse(input) as CreateProviderInput;
}
export function validateCreateTemplate(input: CreateTemplateInput): CreateTemplateInput {
  return createTemplateSchema.parse(input) as CreateTemplateInput;
}
export function validateCreateTrigger(input: CreateTriggerInput): CreateTriggerInput {
  return createTriggerSchema.parse(input) as CreateTriggerInput;
}
export function validateCreateNotificationCampaign(input: CreateNotificationCampaignInput): CreateNotificationCampaignInput {
  return createNotificationCampaignSchema.parse(input) as CreateNotificationCampaignInput;
}
export function validateSendNotification(input: SendNotificationInput): SendNotificationInput {
  return sendNotificationSchema.parse(input) as SendNotificationInput;
}
export function validateNotificationEvent(input: NotificationEventInput): NotificationEventInput {
  return notificationEventSchema.parse(input) as NotificationEventInput;
}
