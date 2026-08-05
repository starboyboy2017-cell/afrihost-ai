/**
 * Module 18 — Stock : adapter Prisma.
 */
import type {
  InventoryRepository,
  CreatePurchaseOrderInput,
  CreateReceiptInput,
  CreateStockCountInput,
  PurchaseOrderStatus,
  StockItem,
  StockMovementInput,
  Supplier,
  Warehouse,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaInventoryRepository implements InventoryRepository {
  async createWarehouse(hotelId: string, name: string): Promise<Warehouse> {
    const w = await prisma.warehouse.create({ data: { hotelId, name } });
    return { id: w.id, hotelId: w.hotelId, name: w.name, isActive: w.isActive };
  }
  async listWarehouses(hotelId: string): Promise<Warehouse[]> {
    const rows = await prisma.warehouse.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((w) => ({ id: w.id, hotelId: w.hotelId, name: w.name, isActive: w.isActive }));
  }
  async warehouseExists(hotelId: string, id: string): Promise<boolean> {
    const w = await prisma.warehouse.findFirst({ where: { id, hotelId } });
    return w !== null;
  }
  async createSupplier(hotelId: string, input: { name: string; phone?: string | null; email?: string | null }): Promise<Supplier> {
    const s = await prisma.supplier.create({ data: { hotelId, name: input.name, phone: input.phone ?? null, email: input.email ?? null } });
    return { id: s.id, hotelId: s.hotelId, name: s.name, phone: s.phone, email: s.email, isActive: s.isActive };
  }
  async listSuppliers(hotelId: string): Promise<Supplier[]> {
    const rows = await prisma.supplier.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((s) => ({ id: s.id, hotelId: s.hotelId, name: s.name, phone: s.phone, email: s.email, isActive: s.isActive }));
  }
  async supplierExists(hotelId: string, id: string): Promise<boolean> {
    const s = await prisma.supplier.findFirst({ where: { id, hotelId } });
    return s !== null;
  }
  async getStockItem(hotelId: string, productId: string, warehouseId?: string | null): Promise<StockItem | null> {
    const i = await prisma.stockItem.findFirst({ where: { hotelId, productId, warehouseId: warehouseId ?? null } });
    return i ? mapItem(i) : null;
  }
  async getOrCreateStockItem(hotelId: string, productId: string, warehouseId?: string | null): Promise<StockItem> {
    const existing = await this.getStockItem(hotelId, productId, warehouseId);
    if (existing) return existing;
    const i = await prisma.stockItem.create({ data: { hotelId, productId, warehouseId: warehouseId ?? null, quantity: 0 } });
    return mapItem(i);
  }
  async updateStockQuantity(id: string, quantity: number, unitCost?: number | null): Promise<void> {
    await prisma.stockItem.update({ where: { id }, data: { quantity, ...(unitCost !== undefined && unitCost !== null ? { unitCost } : {}) } });
  }
  async setStockLevels(id: string, data: { minLevel?: number | null; maxLevel?: number | null; reorderLevel?: number | null }): Promise<void> {
    await prisma.stockItem.update({ where: { id }, data: { minLevel: data.minLevel ?? undefined, maxLevel: data.maxLevel ?? undefined, reorderLevel: data.reorderLevel ?? undefined } });
  }
  async listStockItems(hotelId: string, lowStock = false): Promise<StockItem[]> {
    const where: Record<string, unknown> = { hotelId };
    if (lowStock) where.minLevel = { not: null };
    const rows = await prisma.stockItem.findMany({ where });
    return rows.map(mapItem);
  }
  async productExists(hotelId: string, productId: string): Promise<boolean> {
    const p = await prisma.product.findFirst({ where: { id: productId, hotelId } });
    return p !== null;
  }
  async createPurchaseOrder(hotelId: string, input: CreatePurchaseOrderInput & { poRef: string; createdBy?: string }): Promise<{ id: string; poRef: string }> {
    const po = await prisma.purchaseOrder.create({
      data: { hotelId, supplierId: input.supplierId, poRef: input.poRef, notes: input.notes ?? null, expectedDate: input.expectedDate ? new Date(input.expectedDate) : null, createdBy: input.createdBy ?? null },
    });
    await prisma.purchaseOrderLine.createMany({
      data: input.lines.map((l) => ({ purchaseOrderId: po.id, productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, amount: Math.round(l.quantity * l.unitPrice) })),
    });
    return { id: po.id, poRef: po.poRef };
  }
  async setPurchaseOrderStatus(hotelId: string, poId: string, status: PurchaseOrderStatus): Promise<void> {
    await prisma.purchaseOrder.update({ where: { id: poId, hotelId }, data: { status, receivedAt: status === "RECEIVED" ? new Date() : undefined } });
  }
  async nextPoRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.purchaseOrder.findFirst({ where: { poRef: { startsWith: `PO-${year}-` } }, orderBy: { poRef: "desc" }, select: { poRef: true } });
    const seq = last ? parseInt(last.poRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `PO-${year}-${String(seq).padStart(4, "0")}`;
  }
  async createReceipt(hotelId: string, input: CreateReceiptInput & { receiptRef: string; receivedBy?: string }): Promise<{ id: string }> {
    const r = await prisma.stockReceipt.create({ data: { hotelId, purchaseOrderId: input.purchaseOrderId ?? null, supplierId: input.supplierId ?? null, receiptRef: input.receiptRef, note: input.note ?? null, receivedBy: input.receivedBy ?? null } });
    await prisma.stockReceiptLine.createMany({
      data: input.lines.map((l) => ({ receiptId: r.id, productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, warehouseId: l.warehouseId ?? null })),
    });
    return { id: r.id };
  }
  async nextReceiptRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.stockReceipt.findFirst({ where: { receiptRef: { startsWith: `RC-${year}-` } }, orderBy: { receiptRef: "desc" }, select: { receiptRef: true } });
    const seq = last ? parseInt(last.receiptRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `RC-${year}-${String(seq).padStart(4, "0")}`;
  }
  async recordMovement(hotelId: string, input: StockMovementInput, createdBy?: string): Promise<void> {
    await prisma.stockMovement.create({ data: { hotelId, productId: input.productId, warehouseId: input.warehouseId ?? null, type: input.type, quantity: input.quantity, unitCost: input.unitCost ?? null, reference: input.reference ?? null, note: input.note ?? null, createdBy: createdBy ?? null } });
  }
  async createStockCount(hotelId: string, input: CreateStockCountInput & { countRef: string; countedBy?: string }): Promise<{ id: string }> {
    const c = await prisma.stockCount.create({ data: { hotelId, warehouseId: input.warehouseId ?? null, countRef: input.countRef, countedBy: input.countedBy ?? null } });
    for (const l of input.lines) {
      const theoretical = await this.getStockItemQuantity(hotelId, l.productId, input.warehouseId ?? null);
      await prisma.stockCountLine.create({ data: { stockCountId: c.id, productId: l.productId, theoreticalQty: theoretical, countedQty: l.countedQty, difference: l.countedQty - theoretical } });
    }
    return { id: c.id };
  }
  async getStockItemQuantity(hotelId: string, productId: string, warehouseId?: string | null): Promise<number> {
    const i = await this.getStockItem(hotelId, productId, warehouseId);
    return i?.quantity ?? 0;
  }
  async setStockCountStatus(hotelId: string, countId: string, status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ADJUSTED"): Promise<void> {
    await prisma.stockCount.update({ where: { id: countId, hotelId }, data: { status, countedAt: status === "ADJUSTED" ? new Date() : undefined } });
  }
  async nextCountRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.stockCount.findFirst({ where: { countRef: { startsWith: `SC-${year}-` } }, orderBy: { countRef: "desc" }, select: { countRef: true } });
    const seq = last ? parseInt(last.countRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `SC-${year}-${String(seq).padStart(4, "0")}`;
  }
}

type ItemRow = { id: string; hotelId: string; productId: string; warehouseId: string | null; quantity: import("@prisma/client").Prisma.Decimal; location: string | null; reorderLevel: import("@prisma/client").Prisma.Decimal | null; minLevel: import("@prisma/client").Prisma.Decimal | null; maxLevel: import("@prisma/client").Prisma.Decimal | null; unitCost: number | null; updatedAt: Date };
function mapItem(i: ItemRow): StockItem {
  return {
    id: i.id, hotelId: i.hotelId, productId: i.productId, warehouseId: i.warehouseId,
    quantity: Number(i.quantity), location: i.location,
    reorderLevel: i.reorderLevel !== null ? Number(i.reorderLevel) : null,
    minLevel: i.minLevel !== null ? Number(i.minLevel) : null,
    maxLevel: i.maxLevel !== null ? Number(i.maxLevel) : null,
    unitCost: i.unitCost, updatedAt: i.updatedAt,
  };
}
