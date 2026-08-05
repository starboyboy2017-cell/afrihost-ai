/**
 * Module 1 — Paramètres généraux : types du domaine.
 */

/** Configuration d'une organisation (société / chaîne). */
export interface OrganisationSettings {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  logoUrl?: string | null;
}

/** Configuration d'un hôtel (établissement). */
export interface HotelSettings {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Devise de base (ISO 4217), ex: XOF, XAF, NGN. */
  currency: string;
  /** Locale (BCP-47), ex: fr, en, fr-BJ. */
  locale: string;
  /** Fuseau (IANA), ex: Africa/Porto-Novo. */
  timezone: string;
  /** Taux de taxe local (0..1), ex: 0.18 pour 18%. */
  vatRate: number;
  /** Options de configuration locale (activation de modules, etc.). */
  features?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Patch (mise à jour partielle) des réglages d'organisation. */
export type OrganisationSettingsPatch = Partial<
  Pick<OrganisationSettings, "name" | "legalName" | "logoUrl">
>;

/** Patch (mise à jour partielle) des réglages d'hôtel. */
export type HotelSettingsPatch = Partial<
  Pick<
    HotelSettings,
    | "name"
    | "slug"
    | "code"
    | "address"
    | "city"
    | "country"
    | "phone"
    | "email"
    | "currency"
    | "locale"
    | "timezone"
    | "vatRate"
    | "features"
    | "isActive"
  >
>;
