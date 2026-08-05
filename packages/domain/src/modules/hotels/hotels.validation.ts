/**
 * Module 2 — Gestion multihôtels : validation (zod).
 * Règles (BusinessRules BR-2) : nom non vide, slug [a-z0-9-], code non vide,
 * devise ISO 4217, locale BCP-47, fuseau IANA, TVA ∈ [0,1].
 */

import { z } from "zod";
import type { CreateHotelInput, UpdateHotelInput } from "./hotels.types.js";

const slugRegex = /^[a-z0-9-]+$/;
const currencyRegex = /^[A-Z]{3}$/;
const localeRegex = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function isIanaTimezone(tz: string): boolean {
  try {
    const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
    return supported.includes(tz);
  } catch {
    return /^[A-Za-z_+-]+\/[A-Za-z_+-]+$/.test(tz);
  }
}

export const createHotelSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis"),
  slug: z.string().trim().min(1).regex(slugRegex, "Slug invalide (a-z, 0-9, tirets)"),
  code: z.string().trim().min(1, "Le code est requis"),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().min(2).max(2, "Pays : code ISO 2 lettres").optional(),
  phone: z.string().trim().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  currency: z.string().regex(currencyRegex, "Devise invalide (ISO 4217)").default("XOF"),
  locale: z.string().regex(localeRegex, "Locale invalide (BCP-47)").default("fr"),
  timezone: z
    .string()
    .refine(isIanaTimezone, "Fuseau invalide (IANA)")
    .default("Africa/Porto-Novo"),
  vatRate: z.number().min(0).max(1, "Le taux doit être entre 0 et 1").default(0),
  features: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const updateHotelSchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).regex(slugRegex).optional(),
  code: z.string().trim().min(1).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().min(2).max(2).optional(),
  phone: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal("")),
  currency: z.string().regex(currencyRegex).optional(),
  locale: z.string().regex(localeRegex).optional(),
  timezone: z.string().refine(isIanaTimezone).optional(),
  vatRate: z.number().min(0).max(1).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
}).strict();

/** Valide une saisie de création. Retourne l'entrée normalisée. */
export function validateCreateHotel(input: CreateHotelInput): CreateHotelInput {
  return createHotelSchema.parse(input) as CreateHotelInput;
}

/** Valide une mise à jour. */
export function validateUpdateHotel(input: UpdateHotelInput): UpdateHotelInput {
  return updateHotelSchema.parse(input) as UpdateHotelInput;
}
