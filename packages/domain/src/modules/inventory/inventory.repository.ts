/**
 * Module 18 — Stock : port de persistance.
 */
import type {
  CreatePurchaseOrderInput,
  CreateReceiptInput,
  CreateStockCountInput,
  PurchaseOrderStatus,
  StockCountStatus,
  StockItem,
  StockMovementInput,
  StockMovementType,
  Supplier,
  Warehouse,
} from "./inventory.types.js";

export interface InventoryRepository {
  // Entrepôts
  createWarehouse(hotelId: string, name: string): Promise<Warehouse>;
  listWarehouses(hotelId: string): Promise<Warehouse[]>;
  warehouseExists(hotelId: string, warehouseId: string): Promise<boolean>;

  // Fournisseurs
  createSupplier(hotelId: string, input: { name: string; phone?: string | null; email?: string | null }): Promise<Supplier>;
  listSuppliers(hotelId: string): Promise<Supplier[]>;
  supplierExists(hotelId: string, supplierId: string): Promise<boolean>;

  // Stock
  getStockItem(hotelId: string, productId: string, warehouseId?: string | null): Promise<StockItem | null>;
  getOrCreateStockItem(hotelId: string, productId: string, warehouseId?: string | null): Promise<StockItem>;
  updateStockQuantity(stockItemId: string, quantity: number, unitCost?: number | null): Promise<void>;
  setStockLevels(stockItemId: string, data: { minLevel?: number | null; maxLevel?: number | null; reorderLevel?: number | null }): Promise<void>;
  listStockItems(hotelId: string, lowStock?: boolean): Promise<StockItem[]>;
  productExists(hotelId: string, productId: string): Promise<boolean>;

  // Commandes fournisseurs
  createPurchaseOrder(hotelId: string, input: CreatePurchaseOrderInput & { poRef: string; createdBy?: string }): Promise<{ id: string; poRef: string }>;
  setPurchaseOrderStatus(hotelId: string, poId: string, status: PurchaseOrderStatus): Promise<void>;
  nextPoRef(): Promise<string>;

  // Réceptions
  createReceipt(hotelId: string, input: CreateReceiptInput & { receiptRef: string; receivedBy?: string }): Promise<{ id: string }>;
  nextReceiptRef(): Promise<string>;

  // Mouvements
  recordMovement(hotelId: string, input: StockMovementInput, createdBy?: string): Promise<void>;

  // Inventaires
  createStockCount(hotelId: string, input: CreateStockCountInput & { countRef: string; countedBy?: string }): Promise<{ id: string }>;
  getStockItemQuantity(hotelId: string, productId: string, warehouseId?: string | null): Promise<number>;
  setStockCountStatus(hotelId: string, countId: string, status: StockCountStatus): Promise<void>;
  nextCountRef(): Promise<string>;

  /** Journalise l'audit (port par défaut : AuditTrail via le service). */
}
