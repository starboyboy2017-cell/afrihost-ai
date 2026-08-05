/**
 * Module 20 — Paiements & facturation (folios clients) : types du domaine.
 */

/** Type de frais de folio. */
export type FolioChargeType = "ROOM" | "RESTAURANT" | "ROOM_SERVICE" | "LAUNDRY" | "TRANSPORT" | "MAINTENANCE" | "MINIBAR" | "OTHER";

/** Statut de folio. */
export type FolioStatus = "OPEN" | "CLOSED";

/** Moyen de paiement (réutilise le type POS). */
import type { PaymentMethod } from "../pos/pos.types.js";

/** Type de paiement (partiel/acompte/caution/différé). */
export type PaymentKind = "PARTIAL" | "DEPOSIT" | "CAUTION" | "FULL" | "DEFERRED";

/** Folio client. */
export interface Folio {
  id: string;
  hotelId: string;
  reservationId?: string | null;
  guestId: string;
  folioRef: string;
  name?: string | null;
  status: FolioStatus;
  groupRef?: string | null;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Ligne de frais d'un folio. */
export interface FolioLine {
  id: string;
  folioId: string;
  chargeType: FolioChargeType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  sourceRef?: string | null;
  postedAt?: Date;
  voided: boolean;
}

/** Passerelle de paiement. */
export interface PaymentGateway {
  id: string;
  hotelId: string;
  name: string;
  provider: string;
  isActive: boolean;
  config?: Record<string, unknown> | null;
}

/** Saisie de création d'un folio. */
export interface CreateFolioInput {
  guestId: string;
  reservationId?: string | null;
  name?: string | null;
  groupRef?: string | null;
  currency?: string;
}

/** Saisie d'ajout d'une ligne de frais. */
export interface AddFolioLineInput {
  folioId: string;
  chargeType: FolioChargeType;
  description: string;
  quantity?: number;
  unitPrice: number;
  taxRate?: number;
  sourceRef?: string | null;
}

/** Saisie de paiement. */
export interface BillingPaymentInput {
  folioId: string;
  amount: number;
  method: PaymentMethod;
  kind?: PaymentKind;
  invoiceId?: string | null;
  gatewayId?: string | null;
  reference?: string | null;
}

/** Saisie de passerelle. */
export interface CreateGatewayInput {
  name: string;
  provider: string;
  config?: Record<string, unknown>;
}

/** Résultat de facturation consolidée. */
export interface ConsolidatedInvoice {
  invoiceId: string;
  number: string;
  subtotal: number;
  taxAmount: number;
  total: number;
}
