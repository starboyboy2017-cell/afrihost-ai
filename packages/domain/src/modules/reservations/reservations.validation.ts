/**
 * Module 3 — Réservations : validation (zod).
 * Règles (BusinessRules BR-5.4) :
 *   - departure > arrival ; durée >= 1 nuit ;
 *   - capacité cohérente (adultes+enfants >= 1, pas de valeur négative) ;
 *   - montants >= 0.
 */

import { z } from "zod";
import type { CreateReservationInput, UpdateReservationInput } from "./reservations.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createReservationSchema = z
  .object({
    guestId: z.string().min(1).optional().nullable(),
    roomId: z.string().optional().nullable(),
    roomTypeId: z.string().optional().nullable(),
    source: z.enum(["DIRECT", "WEBSITE", "OTA", "PHONE", "WALK_IN", "CORPORATE", "AGENCY", "CHANNEL_MANAGER"]),
    channel: z.string().trim().optional().nullable(),
    arrivalDate: dateCoerce,
    departureDate: dateCoerce,
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    baseRate: z.number().int().min(0).optional(),
    discountAmount: z.number().int().min(0).default(0),
    currency: z.string().regex(/^[A-Z]{3}$/).default("XOF"),
    notes: z.string().trim().optional().nullable(),
    confirmationNumber: z.string().trim().optional().nullable(),
  })
  .strict()
  .refine((d) => d.departureDate.getTime() > d.arrivalDate.getTime(), {
    message: "departureDate doit être après arrivalDate",
    path: ["departureDate"],
  })
  .refine((d) => {
    const nights = Math.round(
      (d.departureDate.getTime() - d.arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return nights >= 1;
  }, { message: "Durée minimale : 1 nuit", path: ["arrivalDate"] });

export const updateReservationSchema = z
  .object({
    guestId: z.string().min(1).optional().nullable(),
    roomId: z.string().optional().nullable(),
    roomTypeId: z.string().optional().nullable(),
    arrivalDate: dateCoerce.optional(),
    departureDate: dateCoerce.optional(),
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
    notes: z.string().trim().optional().nullable(),
    confirmationNumber: z.string().trim().optional().nullable(),
  })
  .strict()
  .refine((d) => !(d.arrivalDate && d.departureDate) || d.departureDate.getTime() > d.arrivalDate.getTime(), {
    message: "departureDate doit être après arrivalDate",
    path: ["departureDate"],
  });

/** Valide une saisie de création. */
export function validateCreateReservation(input: CreateReservationInput): CreateReservationInput {
  return createReservationSchema.parse(input) as CreateReservationInput;
}

/** Valide une mise à jour. */
export function validateUpdateReservation(input: UpdateReservationInput): UpdateReservationInput {
  return updateReservationSchema.parse(input) as UpdateReservationInput;
}
