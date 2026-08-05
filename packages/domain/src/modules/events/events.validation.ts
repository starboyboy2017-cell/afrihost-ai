/**
 * Module 27 — Événements & Groupes : validation (zod).
 */
import { z } from "zod";
import type {
  CreateContractInput,
  CreateEquipmentInput,
  CreateEventInput,
  CreateGroupInput,
  CreateServiceOrderInput,
  CreateVenueInput,
} from "./events.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" }).optional().nullable();
const json = z.record(z.string(), z.unknown()).optional();

export const createGroupSchema = z.object({
  companyId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(1, "Nom requis"),
  type: z.string().trim().default("GROUP"),
  contactName: z.string().trim().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  totalRooms: z.number().int().min(0).optional(),
  arrivalDate: dateCoerce,
  departureDate: dateCoerce,
  notes: z.string().trim().optional().nullable(),
}).strict();

export const createVenueSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  capacity: z.number().int().min(0).optional(),
  seatingModes: json,
  basePrice: z.number().int().min(0).optional(),
  currency: z.string().trim().default("XOF"),
}).strict();

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  category: z.string().trim().default("AV"),
  quantity: z.number().int().min(0).optional(),
}).strict();

export const createEventSchema = z.object({
  groupId: z.string().min(1).optional().nullable(),
  venueId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(1, "Nom requis"),
  eventType: z.string().trim().default("SEMINAR"),
  startAt: dateCoerce,
  endAt: dateCoerce,
  expectedAttendees: z.number().int().min(0).optional(),
  notes: z.string().trim().optional().nullable(),
}).strict();

export const createContractSchema = z.object({
  groupId: z.string().min(1).optional().nullable(),
  eventId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(1, "Titre requis"),
  contractType: z.string().trim().default("QUOTE"),
  amount: z.number().int().min(0).optional(),
  currency: z.string().trim().default("XOF"),
  validUntil: dateCoerce,
}).strict();

export const createServiceOrderSchema = z.object({
  groupId: z.string().min(1).optional().nullable(),
  eventId: z.string().min(1).optional().nullable(),
  department: z.string().trim().min(1, "Département requis"),
  title: z.string().trim().min(1, "Titre requis"),
  detail: z.string().trim().optional().nullable(),
  dueAt: dateCoerce,
}).strict();

export function validateCreateGroup(input: CreateGroupInput): CreateGroupInput {
  return createGroupSchema.parse(input) as CreateGroupInput;
}
export function validateCreateVenue(input: CreateVenueInput): CreateVenueInput {
  return createVenueSchema.parse(input) as CreateVenueInput;
}
export function validateCreateEquipment(input: CreateEquipmentInput): CreateEquipmentInput {
  return createEquipmentSchema.parse(input) as CreateEquipmentInput;
}
export function validateCreateEvent(input: CreateEventInput): CreateEventInput {
  return createEventSchema.parse(input) as CreateEventInput;
}
export function validateCreateContract(input: CreateContractInput): CreateContractInput {
  return createContractSchema.parse(input) as CreateContractInput;
}
export function validateCreateServiceOrder(input: CreateServiceOrderInput): CreateServiceOrderInput {
  return createServiceOrderSchema.parse(input) as CreateServiceOrderInput;
}
