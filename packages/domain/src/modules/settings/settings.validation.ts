/**
 * Module 1 — Paramètres généraux : schémas de validation (zod).
 *
 * Règles (BusinessRules.md) :
 *  - nom obligatoire, non vide ;
 *  - devise ISO 4217 (3 lettres majuscules) ;
 *  - locale BCP-47 ;
 *  - fuseau horaire IANA valide ;
 *  - taux de taxe entre 0 et 1 (0..100%) ;
 *  - code hôtel non vide.
 */

import { z } from "zod";
import type { OrganisationSettingsPatch, HotelSettingsPatch } from "./settings.types.js";

/** Fuseaux IANA valides (résolus à l'exécution ; repli sur une liste courante). */
function isIanaTimezone(tz: string): boolean {
  try {
    const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
    return supported.includes(tz);
  } catch {
    // Repli : quelques fuseaux fréquents
    return /^[A-Za-z_+-]+\/[A-Za-z_+-]+$/.test(tz);
  }
}

const localeRegex = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const currencyRegex = /^[A-Z]{3}$/;

export const organisationPatchSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").optional(),
  legalName: z.string().trim().optional(),
  logoUrl: z.string().url("URL invalide").optional().or(z.literal("")),
}).strict();

export const hotelPatchSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").optional(),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/, "Slug invalide").optional(),
  code: z.string().trim().min(1, "Le code est requis").optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().min(2).max(2, "Pays : code ISO à 2 lettres").optional(),
  phone: z.string().trim().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  currency: z.string().regex(currencyRegex, "Devise invalide (ISO 4217)").optional(),
  locale: z.string().regex(localeRegex, "Locale invalide (BCP-47)").optional(),
  timezone: z
    .string()
    .refine(isIanaTimezone, "Fuseau horaire invalide (IANA)")
    .optional(),
  vatRate: z.number().min(0).max(1, "Le taux doit être entre 0 et 1").optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
}).strict();

/** Valide un patch d'organisation. Retourne le patch nettoyé. */
export function validateOrganisationPatch(patch: OrganisationSettingsPatch): OrganisationSettingsPatch {
  return organisationPatchSchema.parse(patch) as OrganisationSettingsPatch;
}

/** Valide un patch d'hôtel. Retourne le patch nettoyé. */
export function validateHotelPatch(patch: HotelSettingsPatch): HotelSettingsPatch {
  return hotelPatchSchema.parse(patch) as HotelSettingsPatch;
}
