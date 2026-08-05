/**
 * Module 18 — Stock & inventaire : service métier.
 *
 * Fonctionnalités :
 *   - entrepôts, fournisseurs ;
 *   - **approvisionnements** : commandes fournisseurs, réceptions, contrôle des livraisons ;
 *   - **seuils** min/max + alertes de réapprovisionnement ;
 *   - **mouvements de stock** : entrées, sorties, transferts, ajustements, retours, pertes, casse ;
 *   - **inventaires physiques** + valorisation (coût unitaire configurable) ;
 *   - **décrémentation automatique** depuis POS, cuisine, blanchisserie, maintenance (via mouvement ISSUE).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC inventory.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { InventoryError } from "./inventory.error.js";
import type { InventoryRepository } from "./inventory.repository.js";
import type {
  CreatePurchaseOrderInput,
  CreateReceiptInput,
  CreateStockCountInput,
  StockMovementInput,
  StockMovementType,
  Supplier,
  Warehouse,
} from "./inventory.types.js";
import {
  validateCreatePurchaseOrder,
  validateCreateReceipt,
  validateCreateStockCount,
  validateStockMovement,
} from "./inventory.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface InventoryActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

/** Règle de signe des mouvements : types entrants (+) / sortants (-). */
const INBOUND: StockMovementType[] = ["RECEIPT", "TRANSFER", "RETURN", "PRODUCTION"];
const OUTBOUND: StockMovementType[] = ["ISSUE", "ADJUSTMENT", "LOSS", "BREAKAGE"];

export class InventoryService {
  constructor(
    private readonly repo: InventoryRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---- Entrepôts & fournisseurs ----

  async createWarehouse(hotelId: string, name: string, actor: InventoryActor): Promise<Warehouse> {
    this.assertHotel(hotelId, actor);
    const w = await this.repo.createWarehouse(hotelId, name);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "inventory.warehouse.create", entityType: "Warehouse", entityId: w.id, after: { name } });
    return w;
  }

  async listWarehouses(hotelId: string, actor: InventoryActor): Promise<Warehouse[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listWarehouses(hotelId);
  }

  async createSupplier(hotelId: string, input: { name: string; phone?: string | null; email?: string | null }, actor: InventoryActor): Promise<Supplier> {
    this.assertHotel(hotelId, actor);
    const s = await this.repo.createSupplier(hotelId, input);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "inventory.supplier.create", entityType: "Supplier", entityId: s.id, after: { name: s.name } });
    return s;
  }

  async listSuppliers(hotelId: string, actor: InventoryActor): Promise<Supplier[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listSuppliers(hotelId);
  }

  // ---- Seuils & alertes ----

  /** Définit les seuils min/max/reorder d'un article. */
  async setLevels(hotelId: string, productId: string, data: { minLevel?: number | null; maxLevel?: number | null; reorderLevel?: number | null }, actor: InventoryActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.productExists(hotelId, productId))) throw new InventoryError("Article introuvable");
    const item = await this.repo.getOrCreateStockItem(hotelId, productId);
    await this.repo.setStockLevels(item.id, data);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "inventory.levels.set", entityType: "StockItem", entityId: item.id, after: data });
  }

  /** Liste les articles sous le seuil (alertes de réapprovisionnement). */
  async listLowStock(hotelId: string, actor: InventoryActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.listStockItems(hotelId, true);
  }

  // ---- Commandes fournisseurs ----

  /** Crée une commande fournisseur. */
  async createPurchaseOrder(hotelId: string, input: CreatePurchaseOrderInput, actor: InventoryActor): Promise<{ id: string; poRef: string }> {
    this.assertHotel(hotelId, actor);
    const v = validateCreatePurchaseOrder(input);
    if (!(await this.repo.supplierExists(hotelId, v.supplierId))) throw new InventoryError("Fournisseur introuvable");
    for (const l of v.lines) {
      if (!(await this.repo.productExists(hotelId, l.productId))) throw new InventoryError("Article introuvable");
    }
    const poRef = await this.repo.nextPoRef();
    const po = await this.repo.createPurchaseOrder(hotelId, { ...v, poRef, createdBy: actor.actorUserId });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "inventory.purchase_order.create", entityType: "PurchaseOrder", entityId: po.id, after: { poRef, status: "DRAFT", lines: v.lines.length } });
    return po;
  }

  // ---- Réceptions / contrôle des livraisons ----

  /** Réceptionne une livraison : augmente le stock (RECEIPT). */
  async receive(hotelId: string, input: CreateReceiptInput, actor: InventoryActor): Promise<{ id: string }> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateReceipt(input);
    for (const l of v.lines) {
      if (!(await this.repo.productExists(hotelId, l.productId))) throw new InventoryError("Article introuvable");
    }
    const receiptRef = await this.repo.nextReceiptRef();
    const receipt = await this.repo.createReceipt(hotelId, { ...v, receiptRef, receivedBy: actor.actorUserId });

    // Appliquer les entrées de stock
    for (const l of v.lines) {
      await this.applyMovement(hotelId, {
        productId: l.productId, type: "RECEIPT", quantity: l.quantity, warehouseId: l.warehouseId ?? null,
        unitCost: l.unitPrice, reference: receiptRef, note: "Réception livraison",
      }, actor);
    }
    if (v.purchaseOrderId) {
      await this.repo.setPurchaseOrderStatus(hotelId, v.purchaseOrderId, "RECEIVED");
    }
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "inventory.receive", entityType: "StockReceipt", entityId: receipt.id, after: { receiptRef, lines: v.lines.length } });
    return receipt;
  }

  // ---- Mouvements de stock ----

  /** Applique un mouvement de stock (décrémentation auto depuis POS/cuisine/etc.). */
  async applyMovement(hotelId: string, input: StockMovementInput, actor: InventoryActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const v = validateStockMovement(input);
    if (!(await this.repo.productExists(hotelId, v.productId))) throw new InventoryError("Article introuvable");

    const item = await this.repo.getOrCreateStockItem(hotelId, v.productId, v.warehouseId ?? null);
    const delta = INBOUND.includes(v.type) ? v.quantity : -v.quantity;
    const newQty = Math.max(0, item.quantity + delta);

    await this.repo.recordMovement(hotelId, v, actor.actorUserId);
    await this.repo.updateStockQuantity(item.id, newQty, v.unitCost ?? undefined);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: `inventory.movement.${v.type.toLowerCase()}`, entityType: "StockMovement", entityId: item.id, after: { type: v.type, qty: v.quantity, productId: v.productId } });
  }

  // ---- Inventaires physiques ----

  /** Crée et réalise un inventaire physique : compare compté vs théorique et ajuste. */
  async performStockCount(hotelId: string, input: CreateStockCountInput, actor: InventoryActor): Promise<{ id: string }> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateStockCount(input);
    const countRef = await this.repo.nextCountRef();
    const count = await this.repo.createStockCount(hotelId, { ...v, countRef, countedBy: actor.actorUserId });

    for (const l of v.lines) {
      const theoretical = await this.repo.getStockItemQuantity(hotelId, l.productId, v.warehouseId ?? null);
      const difference = l.countedQty - theoretical;
      if (difference !== 0) {
        // Ajustement du stock pour rattraper l'écart
        await this.applyMovement(hotelId, {
          productId: l.productId, type: "ADJUSTMENT", quantity: Math.abs(difference), warehouseId: v.warehouseId ?? null,
          reference: countRef, note: `Inventaire ${countRef} écart ${difference}`,
        }, actor);
      }
    }
    await this.repo.setStockCountStatus(hotelId, count.id, "ADJUSTED");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "inventory.stock_count", entityType: "StockCount", entityId: count.id, after: { countRef, lines: v.lines.length } });
    return count;
  }

  /** Décrémentation rapide (consommation depuis POS/cuisine/blanchisserie/maintenance). */
  async issue(hotelId: string, productId: string, quantity: number, actor: InventoryActor, reference?: string): Promise<void> {
    return this.applyMovement(hotelId, { productId, type: "ISSUE", quantity, reference: reference ?? null, note: "Consommation" }, actor);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: InventoryActor): void {
    if (actor.hotelId !== hotelId) throw new InventoryError("Accès inter-hôtel refusé");
  }
}
