/**
 * Module 14 — Cuisine : validation (zod).
 */

import { z } from "zod";
import type { CreateKitchenOrderInput, CreateStationInput } from "./kitchen.types.js";

const statusEnum = ["NEW", "PREPARING", "READY", "SERVED", "MODIFIED", "CANCELLED"] as const;
const priorityEnum = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createStationSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
}).strict();

export const createKitchenOrderSchema = z.object({
  posOrderId: z.string().min(1),
  stationId: z.string().min(1),
  priority: z.enum(priorityEnum).default("MEDIUM"),
  notes: z.string().trim().optional().nullable(),
  posPointId: z.string().min(1).optional().nullable(),
  reservationId: z.string().min(1).optional().nullable(),
  roomId: z.string().min(1).optional().nullable(),
}).strict();

export const kitchenStatusSchema = z.enum(statusEnum);

export function validateCreateStation(input: CreateStationInput): CreateStationInput {
  return createStationSchema.parse(input) as CreateStationInput;
}
export function validateCreateKitchenOrder(input: CreateKitchenOrderInput): CreateKitchenOrderInput {
  return createKitchenOrderSchema.parse(input) as CreateKitchenOrderInput;
}
export function validateKitchenStatus(status: string): KitchenOrderStatus {
  return kitchenStatusSchema.parse(status);
}
type KitchenOrderStatus = (typeof statusEnum)[number];
