/**
 * Module 18 — Stock & inventaire : types du domaine.
 */

/** Type de mouvement de stock. */
export type StockMovementType = "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT" | "RETURN" | "LOSS" | "BREAKAGE" | "PRODUCTION";

/** Statut de commande fournisseur. */
export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

/** Statut d'inventaire. */
export type StockCountStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ADJUSTED";

/** Entrepôt. */
export interface Warehouse {
  id: string;
  hotelId: string;
  name: string;
  location?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Fournisseur. */
export interface Supplier {
  id: string;
  hotelId: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

/** Article en stock (StockItem enrichi). */
export interface StockItem {
  id: string;
  hotelId: string;
  productId: string;
  warehouseId?: string | null;
  quantity: number;
  location?: string | null;
  reorderLevel?: number | null;
  minLevel?: number | null;
  maxLevel?: number | null;
  unitCost?: number | null;
  updatedAt?: Date;
}

/** Ligne d'une commande fournisseur. */
export interface PurchaseOrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** Saisie de création d'une commande fournisseur. */
export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: Date | string | null;
  notes?: string | null;
  lines: PurchaseOrderLineInput[];
}

/** Saisie de réception de livraison. */
export interface CreateReceiptInput {
  purchaseOrderId?: string | null;
  supplierId?: string | null;
  lines: { productId: string; quantity: number; unitPrice: number; warehouseId?: string | null }[];
  note?: string | null;
}

/** Saisie de mouvement de stock. */
export interface StockMovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number; // valeur positive ; le signe est dérivé du type
  warehouseId?: string | null;
  unitCost?: number | null;
  reference?: string | null;
  note?: string | null;
}

/** Saisie d'inventaire physique. */
export interface CreateStockCountInput {
  warehouseId?: string | null;
  lines: { productId: string; countedQty: number }[];
}

/** Filtre de recherche. */
export interface StockFilter {
  hotelId: string;
  productId?: string;
  warehouseId?: string;
  type?: StockMovementType;
  lowStock?: boolean;
  limit?: number;
  offset?: number;
}
