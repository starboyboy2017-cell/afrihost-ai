/**
 * Module 10 — Maintenance : validation (zod).
 */

import { z } from "zod";
import type { CreateMaintenanceInput, UpdateMaintenanceInput } from "./maintenance.types.js";

const statusEnum = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"] as const;
const priorityEnum = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createMaintenanceSchema = z.object({
  roomId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(1, "Titre requis"),
  description: z.string().trim().optional().nullable(),
  priority: z.enum(priorityEnum).default("MEDIUM"),
  putRoomOutOfOrder: z.boolean().default(false),
  assignedTo: z.string().min(1).optional().nullable(),
}).strict();

export const updateMaintenanceSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  priority: z.enum(priorityEnum).optional(),
  assignedTo: z.string().min(1).optional().nullable(),
}).strict();

export const maintenanceStatusSchema = z.enum(statusEnum);

export function validateCreateMaintenance(input: CreateMaintenanceInput): CreateMaintenanceInput {
  return createMaintenanceSchema.parse(input) as CreateMaintenanceInput;
}
export function validateUpdateMaintenance(input: UpdateMaintenanceInput): UpdateMaintenanceInput {
  return updateMaintenanceSchema.parse(input) as UpdateMaintenanceInput;
}
export function validateMaintenanceStatus(status: string): MaintenanceStatus {
  return maintenanceStatusSchema.parse(status);
}
type MaintenanceStatus = (typeof statusEnum)[number];
