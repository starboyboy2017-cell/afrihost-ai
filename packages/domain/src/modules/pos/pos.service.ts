/**
 * Module 13 — POS Restaurant : service métier.
 *
 * Fonctionnalités :
 *   - **points de vente** (restaurant, bar, room service) ;
 *   - **menus** et lignes (produit + prix + taxe) ;
 *   - **commandes** (création depuis le menu, lien réservation/chambre) ;
 *   - **paiements** (divers moyens) ;
 *   - **remboursements / annulations / modifications** avec **traçabilité** (PosOrderEvent) ;
 *   - **chiffre d'affaires** automatique (getRevenue).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC pos.*.
 * Chaque mutation est journalisée (audit) + événement PosOrderEvent.
 */

import { DomainEvents, type AuditTrail, type EventBus } from "@afrihost/core";
import { PosError } from "./pos.error.js";
import { assertPosTransition } from "./pos.state.js";
import type { PosRepository } from "./pos.repository.js";
import type {
  CreateMenuLineInput,
  CreatePosOrderInput,
  CreatePosPointInput,
  PosOrder,
  PosOrderStatus,
  PosPaymentInput,
  PosPoint,
} from "./pos.types.js";
import { validateCreateMenuLine, validateCreatePosOrder, validateCreatePosPoint, validatePosPayment } from "./pos.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface PosActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class PosService {
  constructor(
    private readonly repo: PosRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée un point de vente. */
  async createPosPoint(hotelId: string, input: CreatePosPointInput, actor: PosActor): Promise<PosPoint> {
    this.assertHotel(hotelId, actor);
    const v = validateCreatePosPoint(input);
    const point = await this.repo.createPosPoint(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "pos.point.create", entityType: "PosPoint", entityId: point.id, after: { name: point.name, kind: point.kind },
    });
    return point;
  }

  /** Liste les points de vente. */
  async listPosPoints(hotelId: string, actor: PosActor): Promise<PosPoint[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listPosPoints(hotelId);
  }

  /** Crée un menu et y ajoute des lignes (produits). */
  async createMenu(hotelId: string, posPointId: string, name: string, lines: CreateMenuLineInput[], actor: PosActor): Promise<{ id: string }> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.posPointExists(hotelId, posPointId))) throw new PosError("Point de vente introuvable");
    const menu = await this.repo.createMenu(hotelId, posPointId, name);
    for (const line of lines) {
      const v = validateCreateMenuLine(line);
      await this.repo.addMenuLine(hotelId, menu.id, v);
    }
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "pos.menu.create", entityType: "PosMenu", entityId: menu.id, after: { name, lines: lines.length },
    });
    return menu;
  }

  /** Liste les lignes de menu d'un point de vente. */
  async listMenuLines(hotelId: string, posPointId: string, actor: PosActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.listMenuLines(hotelId, posPointId);
  }

  /** Crée une commande (calcul automatique : sous-total, taxes, remise, total). */
  async createOrder(hotelId: string, input: CreatePosOrderInput, actor: PosActor): Promise<PosOrder> {
    this.assertHotel(hotelId, actor);
    const v = validateCreatePosOrder(input);
    if (!(await this.repo.posPointExists(hotelId, v.posPointId))) throw new PosError("Point de vente introuvable");

    // Calcul du montant
    let subtotal = 0;
    let taxAmount = 0;
    const lines: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; taxRate: number }[] = [];
    for (const l of v.lines) {
      const product = await this.repo.getProduct(hotelId, l.productId);
      if (!product) throw new PosError("Produit introuvable");
      const qty = l.quantity ?? 1;
      const unitPrice = product.price;
      const lineTotal = unitPrice * qty;
      const tax = Math.round(lineTotal * Number(product.taxRate));
      subtotal += lineTotal;
      taxAmount += tax;
      lines.push({ productId: product.id, productName: product.name, quantity: qty, unitPrice, lineTotal, taxRate: Number(product.taxRate) });
    }
    const discount = v.discountAmount ?? 0;
    const total = subtotal - discount + taxAmount;

    const orderRef = await this.repo.nextOrderRef();
    const order = await this.repo.createOrder(hotelId, { ...v, orderRef, createdBy: actor.actorUserId });
    await this.repo.addOrderLines(order.id, lines);
    await this.repo.logOrderEvent(order.id, "created", actor.actorUserId, `${lines.length} ligne(s)`);

    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "pos.order.create", entityType: "PosOrder", entityId: order.id,
      after: { orderRef, subtotal, taxAmount, discount, total, status: "OPEN" },
    });
    return { ...order, subtotal, taxAmount, discountAmount: discount, total };
  }

  /** Encaissement d'une commande (paiement + statut PAID). */
  async pay(hotelId: string, input: PosPaymentInput, actor: PosActor): Promise<PosOrder> {
    this.assertHotel(hotelId, actor);
    const v = validatePosPayment(input);
    const order = await this.repo.getOrder(hotelId, v.orderId);
    if (!order) throw new PosError("Commande introuvable");
    assertPosTransition(order.status, "PAID");

    await this.repo.recordPayment(hotelId, v, actor.actorUserId);
    const updated = await this.repo.setOrderStatus(hotelId, v.orderId, "PAID");
    await this.repo.logOrderEvent(v.orderId, "payment", actor.actorUserId, `${v.method} ${v.amount}`);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "pos.order.pay", entityType: "PosOrder", entityId: v.orderId,
      after: { status: "PAID", method: v.method, amount: v.amount },
    });
    await this.bus.publish({
      name: DomainEvents.posSaleCompleted,
      hotelId, organisationId: actor.organisationId,
      data: { orderId: v.orderId, amount: v.amount },
    });
    return updated;
  }

  /** Rembourse une commande payée (PAID → REFUNDED). */
  async refund(hotelId: string, orderId: string, actor: PosActor, reason?: string): Promise<PosOrder> {
    this.assertHotel(hotelId, actor);
    const order = await this.repo.getOrder(hotelId, orderId);
    if (!order) throw new PosError("Commande introuvable");
    assertPosTransition(order.status, "REFUNDED");
    const updated = await this.repo.setOrderStatus(hotelId, orderId, "REFUNDED");
    await this.repo.logOrderEvent(orderId, "refund", actor.actorUserId, reason);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "pos.order.refund", entityType: "PosOrder", entityId: orderId,
      before: { status: order.status }, after: { status: "REFUNDED" },
    });
    return updated;
  }

  /** Annule une commande ouverte (OPEN → VOID / CANCELLED). */
  async cancel(hotelId: string, orderId: string, actor: PosActor, reason?: string): Promise<PosOrder> {
    this.assertHotel(hotelId, actor);
    const order = await this.repo.getOrder(hotelId, orderId);
    if (!order) throw new PosError("Commande introuvable");
    assertPosTransition(order.status, "VOID");
    const updated = await this.repo.setOrderStatus(hotelId, orderId, "VOID");
    await this.repo.logOrderEvent(orderId, "void", actor.actorUserId, reason);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "pos.order.void", entityType: "PosOrder", entityId: orderId,
      before: { status: order.status }, after: { status: "VOID" },
    });
    return updated;
  }

  /** Chiffre d'affaires automatique de l'hôtel. */
  async getRevenue(hotelId: string, actor: PosActor): Promise<number> {
    this.assertHotel(hotelId, actor);
    return this.repo.getRevenue(hotelId);
  }

  /** Liste les commandes. */
  async listOrders(hotelId: string, status: PosOrderStatus | undefined, actor: PosActor): Promise<PosOrder[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listOrders(hotelId, status);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: PosActor): void {
    if (actor.hotelId !== hotelId) throw new PosError("Accès inter-hôtel refusé");
  }
}
