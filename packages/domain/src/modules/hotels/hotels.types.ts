/**
 * Module 2 — Gestion multihôtels : types du domaine.
 */

/** Entité hôtel (établissement). */
export interface Hotel {
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
  currency: string;
  locale: string;
  timezone: string;
  vatRate: number;
  features?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'un hôtel. */
export interface CreateHotelInput {
  name: string;
  slug: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string;
  locale?: string;
  timezone?: string;
  vatRate?: number;
  features?: Record<string, unknown> | null;
}

/** Mise à jour partielle d'un hôtel. */
export type UpdateHotelInput = Partial<
  Pick<
    CreateHotelInput,
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
  >
>;

/** Hôtel résumé pour le sélecteur (navigation multihôtel). */
export interface HotelSummary {
  id: string;
  name: string;
  slug: string;
  code: string;
  currency: string;
  isActive: boolean;
  roleCode?: string | null; // rôle de l'utilisateur sur cet hôtel
  isDefault?: boolean;
}

/** Affectation d'un utilisateur à un hôtel avec un rôle (per-hotel RBAC). */
export interface MembershipAssignment {
  userId: string;
  hotelId: string;
  roleCode: string;
  isDefault?: boolean;
}
