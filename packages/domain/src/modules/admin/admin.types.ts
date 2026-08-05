/**
 * Module 29 — Administration & Paramétrage Global : types du domaine.
 *
 * Centre d'administration SaaS : configuration dynamique, multi-hôtel,
 * extensible. Les catégories couvrent le SaaS global, les hôtels, devises,
 * langues, fuseaux, taxes, politiques de réservation, facturation, fournisseurs
 * (paiement, email, SMS, WhatsApp, IA), OTA, fidélité, sauvegardes, sécurité,
 * paramètres métiers.
 */

/** Portée d'une configuration. */
export type ConfigScope = "SAAS" | "HOTEL";

/** Entrée de configuration administrative. */
export interface AdminConfig {
  id: string;
  scope: ConfigScope;
  hotelId?: string | null;
  category: string;
  key: string;
  value?: unknown;
  isActive: boolean;
}

/** Valeur de configuration (type-safe). */
export type ConfigValue = boolean | number | string | null | Record<string, unknown> | unknown[];

// ---------------------------------------------------------------------------
//  CATÉGORIES & CONSTANTES
// ---------------------------------------------------------------------------

export const ADMIN_CATEGORIES = [
  "saas",
  "hotel",
  "currency",
  "language",
  "timezone",
  "tax",
  "booking_policy",
  "billing",
  "payment_provider",
  "email_provider",
  "sms_provider",
  "whatsapp_provider",
  "ai_provider",
  "ota",
  "loyalty",
  "backup",
  "security",
  "business",
] as const;

export type AdminCategory = (typeof ADMIN_CATEGORIES)[number];

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface SetConfigInput {
  category: AdminCategory;
  key: string;
  value: ConfigValue;
  hotelId?: string | null; // requise si scope=HOTEL
  scope?: ConfigScope;
}

export interface ListConfigFilter {
  category?: AdminCategory;
  scope?: ConfigScope;
  hotelId?: string | null;
}

/** Catalogue de référence (devises, langues, fuseaux). */
export interface CurrencyInfo { code: string; name: string; symbol: string; }
export interface LanguageInfo { code: string; name: string; }
export interface TimezoneInfo { id: string; label: string; }
