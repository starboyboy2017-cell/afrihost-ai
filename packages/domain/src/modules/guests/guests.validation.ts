/**
 * Module Guests — Clients : validation (zod).
 * Règles : nom/prénom obligatoires, email/téléphone formatés, dates valides.
 */

import { z } from "zod";
import type { CreateGuestInput, UpdateGuestInput } from "./guests.types.js";

const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createGuestSchema = z
  .object({
    firstName: z.string().trim().min(1, "Prénom requis"),
    lastName: z.string().trim().min(1, "Nom requis"),
    email: z.string().email("Email invalide").optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    nationality: z.string().trim().min(2).max(2, "Nationalité : code ISO 2 lettres").optional().nullable(),
    idDocument: z.string().trim().optional().nullable(),
    idDocumentType: z.string().trim().optional().nullable(),
    birthDate: dateCoerce.optional().nullable(),
    address: z.string().trim().optional().nullable(),
    tags: z.array(z.string().trim()).optional(),
    notes: z.string().trim().optional().nullable(),
    isVip: z.boolean().optional(),
    preferredLanguage: z.string().trim().min(2).max(8).optional().nullable(),
  })
  .strict();

export const updateGuestSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    nationality: z.string().trim().min(2).max(2).optional().nullable(),
    idDocument: z.string().trim().optional().nullable(),
    idDocumentType: z.string().trim().optional().nullable(),
    birthDate: dateCoerce.optional().nullable(),
    address: z.string().trim().optional().nullable(),
    tags: z.array(z.string().trim()).optional(),
    notes: z.string().trim().optional().nullable(),
    isVip: z.boolean().optional(),
    preferredLanguage: z.string().trim().min(2).max(8).optional().nullable(),
  })
  .strict();

export function validateCreateGuest(input: CreateGuestInput): CreateGuestInput {
  return createGuestSchema.parse(input) as CreateGuestInput;
}

export function validateUpdateGuest(input: UpdateGuestInput): UpdateGuestInput {
  return updateGuestSchema.parse(input) as UpdateGuestInput;
}
