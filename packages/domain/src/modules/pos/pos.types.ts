/**
 * Module 13 — POS Restaurant : types du domaine.
 */

/** Type de point de vente. */
export type PosKind = "RESTAURANT" | "BAR" | "ROOM_SERVICE";

/** Statut d'une commande POS. */
export type PosOrderStatus = "OPEN" | "PAID" | "VOID" | "REFUNDED" | "CANCELLED";

/** Moyen de paiement. */
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "ONLINE" | "POS_TERMINAL";

/** Point de vente. */
export interface PosPoint {
  id: string;
  hotelId: string;
  name: string;
  kind: PosKind;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Commande POS. */
export interface PosOrder {
  id: string;
  hotelId: string;
  posPointId: string;
  reservationId?: string | null;
  roomId?: string | null;
  orderRef: string;
  status: PosOrderStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Ligne de commande. */
export interface PosOrderLine {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate: number;
}

/** Ligne de menu. */
export interface PosMenuLine {
  id: string;
  menuId: string;
  productId: string;
  price: number;
  currency: string;
  taxRate: number;
  productName?: string; // jointure
}

/** Saisie de création d'un point de vente. */
export interface CreatePosPointInput {
  name: string;
  kind?: PosKind;
}

/** Saisie d'une ligne de menu. */
export interface CreateMenuLineInput {
  productId: string;
  price: number;
  currency?: string;
  taxRate?: number;
}

/** Saisie de création d'une commande. */
export interface CreatePosOrderInput {
  posPointId: string;
  reservationId?: string | null;
  roomId?: string | null;
  lines: { productId: string; quantity?: number }[];
  discountAmount?: number;
}

/** Saisie de paiement. */
export interface PosPaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
}
