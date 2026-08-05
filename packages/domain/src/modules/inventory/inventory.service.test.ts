import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { InventoryService, type InventoryActor } from "./inventory.service.js";
import { InventoryError } from "./inventory.error.js";
import type { InventoryRepository } from "./inventory.repository.js";
import type {
  CreatePurchaseOrderInput,
  CreateReceiptInput,
  CreateStockCountInput,
  PurchaseOrderStatus,
  StockItem,
  StockMovementInput,
  StockMovementType,
  Supplier,
  Warehouse,
} from "./inventory.types.js";

class MemoryRepo implements InventoryRepository {
  warehouses = new Map<string, Warehouse>();
  suppliers = new Map<string, Supplier>();
  stock = new Map<string, StockItem>();
  products = new Set<string>(["p1", "p2"]);
  seq = 0;

  async createWarehouse(hotelId: string, name: string): Promise<Warehouse> {
    const w: Warehouse = { id: `wh-${++this.seq}`, hotelId, name, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    this.warehouses.set(w.id, w);
    return w;
  }
  async listWarehouses(hotelId: string): Promise<Warehouse[]> { return [...this.warehouses.values()].filter((w) => w.hotelId === hotelId); }
  async warehouseExists(hotelId: string, id: string): Promise<boolean> { const w = this.warehouses.get(id); return !!w && w.hotelId === hotelId; }
  async createSupplier(hotelId: string, input: { name: string; phone?: string | null; email?: string | null }): Promise<Supplier> {
    const s: Supplier = { id: `sup-${++this.seq}`, hotelId, name: input.name, phone: input.phone ?? null, email: input.email ?? null, isActive: true };
    this.suppliers.set(s.id, s);
    return s;
  }
  async listSuppliers(hotelId: string): Promise<Supplier[]> { return [...this.suppliers.values()].filter((s) => s.hotelId === hotelId); }
  async supplierExists(hotelId: string, id: string): Promise<boolean> { const s = this.suppliers.get(id); return !!s && s.hotelId === hotelId; }
  async getStockItem(hotelId: string, productId: string, warehouseId?: string | null): Promise<StockItem | null> {
    return [...this.stock.values()].find((i) => i.hotelId === hotelId && i.productId === productId && (i.warehouseId ?? null) === (warehouseId ?? null)) ?? null;
  }
  async getOrCreateStockItem(hotelId: string, productId: string, warehouseId?: string | null): Promise<StockItem> {
    const existing = await this.getStockItem(hotelId, productId, warehouseId);
    if (existing) return existing;
    const item: StockItem = { id: `si-${++this.seq}`, hotelId, productId, warehouseId: warehouseId ?? null, quantity: 0, updatedAt: new Date() };
    this.stock.set(item.id, item);
    return item;
  }
  async updateStockQuantity(id: string, quantity: number, unitCost?: number | null): Promise<void> {
    const i = this.stock.get(id)!;
    this.stock.set(id, { ...i, quantity, unitCost: unitCost ?? i.unitCost ?? null });
  }
  async setStockLevels(id: string, data: { minLevel?: number | null; maxLevel?: number | null; reorderLevel?: number | null }): Promise<void> {
    const i = this.stock.get(id)!;
    this.stock.set(id, { ...i, minLevel: data.minLevel ?? i.minLevel ?? null, maxLevel: data.maxLevel ?? i.maxLevel ?? null, reorderLevel: data.reorderLevel ?? i.reorderLevel ?? null });
  }
  async listStockItems(hotelId: string, lowStock = false): Promise<StockItem[]> {
    let list = [...this.stock.values()].filter((i) => i.hotelId === hotelId);
    if (lowStock) list = list.filter((i) => i.minLevel !== null && i.minLevel !== undefined && i.quantity <= i.minLevel);
    return list;
  }
  async productExists(hotelId: string, productId: string): Promise<boolean> { return this.products.has(productId); }
  async createPurchaseOrder(hotelId: string, input: CreatePurchaseOrderInput & { poRef: string; createdBy?: string }): Promise<{ id: string; poRef: string }> {
    return { id: `po-${++this.seq}`, poRef: input.poRef };
  }
  async setPurchaseOrderStatus(hotelId: string, poId: string, status: PurchaseOrderStatus): Promise<void> {}
  async nextPoRef(): Promise<string> { return `PO-2026-${String(this.seq + 1).padStart(4, "0")}`; }
  async createReceipt(hotelId: string, input: CreateReceiptInput & { receiptRef: string; receivedBy?: string }): Promise<{ id: string }> { return { id: `rc-${++this.seq}` }; }
  async nextReceiptRef(): Promise<string> { return `RC-2026-${String(this.seq + 1).padStart(4, "0")}`; }
  async recordMovement(hotelId: string, input: StockMovementInput, createdBy?: string): Promise<void> {}
  async createStockCount(hotelId: string, input: CreateStockCountInput & { countRef: string; countedBy?: string }): Promise<{ id: string }> { return { id: `sc-${++this.seq}` }; }
  async getStockItemQuantity(hotelId: string, productId: string, warehouseId?: string | null): Promise<number> {
    const i = await this.getStockItem(hotelId, productId, warehouseId);
    return i?.quantity ?? 0;
  }
  async setStockCountStatus(hotelId: string, countId: string, status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ADJUSTED"): Promise<void> {}
  async nextCountRef(): Promise<string> { return `SC-2026-${String(this.seq + 1).padStart(4, "0")}`; }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new InventoryService(repo, audit, bus);
  const actor: InventoryActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 18 — Stock & inventaire", () => {
  it("crée un entrepôt et un fournisseur", async () => {
    const { service, actor } = setup();
    await service.createWarehouse("h1", "Dépôt principal", actor);
    await service.createSupplier("h1", { name: "Grossiste Bénin" }, actor);
    expect((await service.listWarehouses("h1", actor)).length).toBe(1);
    expect((await service.listSuppliers("h1", actor)).length).toBe(1);
  });

  it("définit les seuils min/max d'un article", async () => {
    const { repo, service, actor } = setup();
    await service.setLevels("h1", "p1", { minLevel: 10, maxLevel: 100 }, actor);
    const item = repo.stock.get([...repo.stock.values()][0]!.id)!;
    expect(item.minLevel).toBe(10);
    expect(item.maxLevel).toBe(100);
  });

  it("crée une commande fournisseur", async () => {
    const { service, actor } = setup();
    const sup = await service.createSupplier("h1", { name: "Grossiste" }, actor);
    const po = await service.createPurchaseOrder("h1", { supplierId: sup.id, lines: [{ productId: "p1", quantity: 50, unitPrice: 100 }] }, actor);
    expect(po.poRef).toMatch(/^PO-2026-/);
  });

  it("réceptionne une livraison et augmente le stock (RECEIPT)", async () => {
    const { repo, service, actor } = setup();
    await service.receive("h1", { lines: [{ productId: "p1", quantity: 100, unitPrice: 100 }] }, actor);
    const item = await repo.getStockItem("h1", "p1");
    expect(item?.quantity).toBe(100);
  });

  it("décrémente le stock (ISSUE) depuis une consommation POS", async () => {
    const { repo, service, actor } = setup();
    await service.receive("h1", { lines: [{ productId: "p1", quantity: 100, unitPrice: 100 }] }, actor);
    await service.issue("h1", "p1", 30, actor, "PO-2026-0001");
    const item = await repo.getStockItem("h1", "p1");
    expect(item?.quantity).toBe(70);
  });

  it("ne descend jamais sous zéro", async () => {
    const { repo, service, actor } = setup();
    await service.issue("h1", "p1", 50, actor);
    const item = await repo.getStockItem("h1", "p1");
    expect(item?.quantity).toBe(0);
  });

  it("liste les articles sous le seuil (alerte réapprovisionnement)", async () => {
    const { repo, service, actor } = setup();
    await service.setLevels("h1", "p1", { minLevel: 10 }, actor);
    await service.receive("h1", { lines: [{ productId: "p1", quantity: 5, unitPrice: 100 }] }, actor); // 5 < min 10
    const low = await service.listLowStock("h1", actor);
    expect(low.length).toBe(1);
    void repo;
  });

  it("réalise un inventaire physique et ajuste l'écart", async () => {
    const { repo, service, actor } = setup();
    await service.receive("h1", { lines: [{ productId: "p1", quantity: 100, unitPrice: 100 }] }, actor);
    // compté = 90, théorique = 100 → écart -10 → ajustement
    await service.performStockCount("h1", { lines: [{ productId: "p1", countedQty: 90 }] }, actor);
    const item = await repo.getStockItem("h1", "p1");
    expect(item?.quantity).toBe(90);
  });

  it("valorise le stock avec le coût unitaire de réception", async () => {
    const { repo, service, actor } = setup();
    await service.receive("h1", { lines: [{ productId: "p1", quantity: 10, unitPrice: 500 }] }, actor);
    const item = await repo.getStockItem("h1", "p1");
    expect(item?.unitCost).toBe(500);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: InventoryActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createWarehouse("h1", "X", other)).rejects.toThrow(InventoryError);
  });

  it("journalise les mouvements", async () => {
    const { writer, service, actor } = setup();
    await service.receive("h1", { lines: [{ productId: "p1", quantity: 10, unitPrice: 100 }] }, actor);
    await service.issue("h1", "p1", 5, actor);
    expect(writer.entries.some((e) => e.action === "inventory.movement.receipt")).toBe(true);
    expect(writer.entries.some((e) => e.action === "inventory.movement.issue")).toBe(true);
  });
});
