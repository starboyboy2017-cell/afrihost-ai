/**
 * Module 33 — Super Administration : validation (zod).
 */
import { z } from "zod";
import type { AddSupportMessageInput, AssignTicketInput, CreateBackupInput, CreateSupportTicketInput, RunMonitorCheckInput, StartImpersonationInput } from "./saasadmin.types.js";

export const createSupportTicketSchema = z.object({
  organisationId: z.string().min(1),
  hotelId: z.string().min(1).optional().nullable(),
  subject: z.string().trim().min(1, "Sujet requis"),
  description: z.string().trim().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
}).strict();

export const addSupportMessageSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "Message requis"),
  isInternal: z.boolean().optional(),
}).strict();

export const assignTicketSchema = z.object({
  ticketId: z.string().min(1),
  assignedTo: z.string().min(1),
}).strict();

export const runMonitorCheckSchema = z.object({
  target: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["UP", "DOWN", "DEGRADED", "WARNING"]).optional(),
  latencyMs: z.number().int().min(0).optional().nullable(),
  detail: z.string().trim().optional().nullable(),
}).strict();

export const createBackupSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  type: z.enum(["AUTO", "MANUAL"]).optional(),
}).strict();

export const startImpersonationSchema = z.object({
  targetUserId: z.string().min(1),
  hotelId: z.string().min(1),
  reason: z.string().trim().optional().nullable(),
}).strict();

export function validateCreateSupportTicket(input: CreateSupportTicketInput): CreateSupportTicketInput { return createSupportTicketSchema.parse(input) as CreateSupportTicketInput; }
export function validateAddSupportMessage(input: AddSupportMessageInput): AddSupportMessageInput { return addSupportMessageSchema.parse(input) as AddSupportMessageInput; }
export function validateAssignTicket(input: AssignTicketInput): AssignTicketInput { return assignTicketSchema.parse(input) as AssignTicketInput; }
export function validateRunMonitorCheck(input: RunMonitorCheckInput): RunMonitorCheckInput { return runMonitorCheckSchema.parse(input) as RunMonitorCheckInput; }
export function validateCreateBackup(input: CreateBackupInput): CreateBackupInput { return createBackupSchema.parse(input) as CreateBackupInput; }
export function validateStartImpersonation(input: StartImpersonationInput): StartImpersonationInput { return startImpersonationSchema.parse(input) as StartImpersonationInput; }
