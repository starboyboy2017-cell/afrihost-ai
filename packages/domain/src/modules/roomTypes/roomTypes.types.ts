/**
 * Module 5 — Types de chambres & tarifs flexibles : types du domaine.
 */

/** Type de chambre (catégorie). */
export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description?: string | null;
  /** Tarif de base par nuit en minor units (repli par défaut). */
  baseRate: number;
  maxOccupancy: number;
  bedCount: number;
  amenities: string[];
  features?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'un type de chambre. */
export interface CreateRoomTypeInput {
  name: string;
  description?: string | null;
  baseRate: number;
  maxOccupancy?: number;
  bedCount?: number;
  amenities?: string[];
  features?: Record<string, unknown> | null;
}

/** Mise à jour partielle d'un type de chambre. */
export interface UpdateRoomTypeInput {
  name?: string;
  description?: string | null;
  baseRate?: number;
  maxOccupancy?: number;
  bedCount?: number;
  amenities?: string[];
  features?: Record<string, unknown> | null;
  isActive?: boolean;
}

/** Type de plan tarifaire. */
export type RatePlanType = "BASE" | "SEASONAL" | "WEEKEND" | "PROMOTIONAL";

/** Plan tarifaire (flexible). */
export interface RatePlan {
  id: string;
  hotelId: string;
  roomTypeId: string;
  name: string;
  type: RatePlanType;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'un plan. */
export interface CreateRatePlanInput {
  roomTypeId: string;
  name: string;
  type?: RatePlanType;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** Prix par devise (ISO 4217 → minor units / nuit). */
  prices?: Record<string, number>;
  restrictions?: RatePlanRestrictionInput;
}

/** Mise à jour partielle d'un plan. */
export interface UpdateRatePlanInput {
  name?: string;
  type?: RatePlanType;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive?: boolean;
  prices?: Record<string, number>;
  restrictions?: RatePlanRestrictionInput;
}

/** Restrictions d'un plan (réservables à l'avenir). */
export interface RatePlanRestrictionInput {
  minNights?: number | null;
  maxNights?: number | null;
  advanceBookingDays?: number | null;
  minAdvanceBookingDays?: number | null;
  maxGuests?: number | null;
}

/** Prix d'un plan pour une devise. */
export interface RatePlanPrice {
  id: string;
  ratePlanId: string;
  currency: string;
  amount: number;
}
