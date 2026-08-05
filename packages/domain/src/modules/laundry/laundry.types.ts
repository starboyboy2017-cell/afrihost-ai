/**
 * Module 11 — Blanchisserie : types du domaine.
 */

/** État du linge (cycle complet). */
export type LaundryState = "CLEAN" | "DISTRIBUTED" | "USED" | "DIRTY" | "WASHING" | "DRYING" | "IRONING";

/** Mode de blanchisserie. */
export type LaundryMode = "INTERNAL" | "EXTERNAL";

/** Type de linge. */
export interface LaundryItemType {
  id: string;
  hotelId: string;
  name: string;
  unit?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Pièce de linge. */
export interface LaundryItem {
  id: string;
  hotelId: string;
  itemTypeId: string;
  code?: string | null;
  state: LaundryState;
  roomId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Lot de lavage. */
export interface LaundryBatch {
  id: string;
  hotelId: string;
  code: string;
  mode: LaundryMode;
  providerName?: string | null;
  startedAt?: Date;
  completedAt?: Date | null;
  responsible?: string | null;
  cost?: number | null;
  currency?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Perte / détérioration. */
export interface LaundryLoss {
  id: string;
  hotelId: string;
  itemId: string;
  reason: "LOST" | "DAMAGED";
  note?: string | null;
  costValue?: number | null;
  createdAt?: Date;
}

/** Saisie de création d'un type de linge. */
export interface CreateItemTypeInput {
  name: string;
  unit?: string | null;
}

/** Saisie d'une pièce de linge. */
export interface CreateItemInput {
  itemTypeId: string;
  code?: string | null;
}

/** Saisie d'un lot de lavage. */
export interface CreateBatchInput {
  mode: LaundryMode;
  providerName?: string | null;
  responsible?: string | null;
  cost?: number | null;
  currency?: string | null;
  notes?: string | null;
  itemIds?: string[];
}

/** Saisie d'une perte. */
export interface CreateLossInput {
  itemId: string;
  reason: "LOST" | "DAMAGED";
  note?: string | null;
  costValue?: number | null;
}

/** Filtre de recherche des pièces. */
export interface LaundryFilter {
  hotelId: string;
  state?: LaundryState;
  itemTypeId?: string;
  limit?: number;
  offset?: number;
}
