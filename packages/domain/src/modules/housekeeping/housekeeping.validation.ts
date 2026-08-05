/**
 * Module 9 — Housekeeping : validation (zod).
 */

import { z } from "zod";
import type { CreateHousekeepingTaskInput, UpdateHousekeepingTaskInput } from "./housekeeping.types.js";

const statusEnum = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "VERIFIED"] as const;
const priorityEnum = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createHousekeepingSchema = z.object({
  roomId: z.string().min(1, "Chambre requise"),
  priority: z.enum(priorityEnum).default("MEDIUM"),
  scheduledAt: dateCoerce.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
}).strict();

export const updateHousekeepingSchema = z.object({
  priority: z.enum(priorityEnum).optional(),
  scheduledAt: dateCoerce.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
}).strict();

export const statusSchema = z.enum(statusEnum);

export function validateCreateTask(input: CreateHousekeepingTaskInput): CreateHousekeepingTaskInput {
  return createHousekeepingSchema.parse(input) as CreateHousekeepingTaskInput;
}
export function validateUpdateTask(input: UpdateHousekeepingTaskInput): UpdateHousekeepingTaskInput {
  return updateHousekeepingSchema.parse(input) as UpdateHousekeepingTaskInput;
}
export function validateStatus(status: string): HousekeepingStatus {
  return statusSchema.parse(status);
}
type HousekeepingStatus = (typeof statusEnum)[number];
