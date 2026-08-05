/**
 * Module 7 — Séjours : validation (zod).
 */

import { z } from "zod";
import type { CheckInInput, CheckOutInput, ChangeRoomInput, ExtendStayInput } from "./stay.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const checkInSchema = z.object({
  reservationId: z.string().min(1),
  roomId: z.string().min(1, "Chambre requise"),
  notes: z.string().trim().optional().nullable(),
}).strict();

export const checkOutSchema = z.object({
  reservationId: z.string().min(1),
  notes: z.string().trim().optional().nullable(),
}).strict();

export const extendStaySchema = z.object({
  reservationId: z.string().min(1),
  newDepartureDate: dateCoerce,
}).strict();

export const changeRoomSchema = z.object({
  reservationId: z.string().min(1),
  newRoomId: z.string().min(1, "Nouvelle chambre requise"),
  reason: z.string().trim().optional().nullable(),
}).strict();

export function validateCheckIn(input: CheckInInput): CheckInInput {
  return checkInSchema.parse(input) as CheckInInput;
}
export function validateCheckOut(input: CheckOutInput): CheckOutInput {
  return checkOutSchema.parse(input) as CheckOutInput;
}
export function validateExtendStay(input: ExtendStayInput): ExtendStayInput {
  return extendStaySchema.parse(input) as ExtendStayInput;
}
export function validateChangeRoom(input: ChangeRoomInput): ChangeRoomInput {
  return changeRoomSchema.parse(input) as ChangeRoomInput;
}
