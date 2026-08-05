/**
 * Module 15 — Caisse : types du domaine.
 */

/** Statut d'une session de caisse. */
export type CashSessionStatus = "OPEN" | "CLOSED";

/** Type de mouvement de caisse. */
export type CashMovementType = "OPENING" | "SALE" | "PAYMENT" | "REFUND" | "VOID" | "EXPENSE" | "CLOSING" | "RECONCILIATION";

/** Moyen de paiement (réutilise le type défini dans pos). */
import type { PaymentMethod } from "../pos/pos.types.js";

/** Caisse (tiroir). */
export interface CashRegister {
  id: string;
  hotelId: string;
  name: string;
  posPointId?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Session de caisse. */
export interface CashSession {
  id: string;
  hotelId: string;
  registerId: string;
  cashierId?: string | null;
  status: CashSessionStatus;
  openedAt?: Date;
  closedAt?: Date | null;
  openingAmount: number;
  closingAmount?: number | null;
  countedAmount?: number | null;
  difference?: number | null;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Mouvement de caisse. */
export interface CashMovement {
  id: string;
  hotelId: string;
  sessionId: string;
  type: CashMovementType;
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
}

/** Saisie de création d'une caisse. */
export interface CreateCashRegisterInput {
  name: string;
  posPointId?: string | null;
}

/** Saisie d'ouverture de session. */
export interface OpenSessionInput {
  registerId: string;
  openingAmount?: number;
  cashierId?: string | null;
  note?: string | null;
}

/** Saisie de mouvement. */
export interface CashMovementInput {
  sessionId: string;
  type: CashMovementType;
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  note?: string | null;
}

/** Clôture + réconciliation. */
export interface CloseSessionInput {
  sessionId: string;
  countedAmount: number;
  note?: string | null;
}

/** Rapport financier d'une session. */
export interface CashReport {
  sessionId: string;
  openingAmount: number;
  totalIn: number; // SALE + PAYMENT + OPENING
  totalRefund: number;
  totalExpense: number;
  expectedClosing: number;
  countedAmount: number | null;
  difference: number | null;
  byMethod: Record<string, number>; // méthode → total encaissé
}
