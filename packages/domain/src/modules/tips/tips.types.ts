/**
 * Module 16 — Gestion des pourboires : types du domaine.
 */

/** Nature d'un pourboire. */
export type TipType = "INDIVIDUAL" | "COLLECTIVE";

/** Statut d'un pourboire. */
export type TipStatus = "PENDING" | "VALIDATED" | "DISTRIBUTED" | "CANCELLED";

/** Moyen de paiement (réutilise celui du POS). */
import type { PaymentMethod } from "../pos/pos.types.js";

/** Règle de répartition configurable par hôtel. */
export interface TipRule {
  id: string;
  hotelId: string;
  name: string;
  isActive: boolean;
  serverPercent: number;
  teamPercent: number;
  kitchenPercent: number;
  otherPercent: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Pourboire. */
export interface Tip {
  id: string;
  hotelId: string;
  posPaymentId?: string | null;
  posOrderId?: string | null;
  type: TipType;
  status: TipStatus;
  amount: number;
  method: PaymentMethod;
  tipRuleId?: string | null;
  validatedBy?: string | null;
  validatedAt?: Date | null;
  distributedAt?: Date | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Répartition d'un pourboire. */
export interface TipAllocation {
  id: string;
  tipId: string;
  recipient: string;
  amount: number;
  createdAt?: Date;
}

/** Saisie de création d'une règle. */
export interface CreateTipRuleInput {
  name: string;
  serverPercent?: number;
  teamPercent?: number;
  kitchenPercent?: number;
  otherPercent?: number;
}

/** Saisie d'enregistrement d'un pourboire. */
export interface CreateTipInput {
  posPaymentId?: string | null;
  posOrderId?: string | null;
  type: TipType;
  amount: number;
  method: PaymentMethod;
  /** Bénéficiaire individuel (si INDIVIDUAL). */
  recipient?: string | null;
  /** Règle de répartition (si COLLECTIVE). */
  tipRuleId?: string | null;
  note?: string | null;
}

/** Filtre de recherche. */
export interface TipFilter {
  hotelId: string;
  status?: TipStatus;
  type?: TipType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
