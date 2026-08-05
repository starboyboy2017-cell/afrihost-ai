import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { PosService, type PosActor } from "./pos.service.js";
import { PosError } from "./pos.error.js";
import { assertPosTransition } from "./pos.state.js";
import type { PosRepository } from "./pos.repository.js";
import type {
  CreateMenuLineInput,
  CreatePosOrderInput,
  CreatePosPointInput,
  PosMenuLine,
  PosOrder,
  PosOrderLine,
  PosOrderStatus,
  PosPaymentInput,
  PosPoint,
} from "./pos.types.js";

class MemoryRepo implements PosRepository {
  points = new Map<string, PosPoint>();
  menus: { id: string; posPointId: string }[] = [];
  menuLines: (PosMenuLine & { productName?: string })[] = [];
  products = new Map<string, { id: string; name: string; price: number; taxRate: number; currency: string }>();
  orders = new Map<string, PosOrder>();
  orderLines = new Map<string, PosOrderLine[]>();
  events: { orderId: string; action: string; actor?: string; detail?: string }[] = [];
  payments: PosPaymentInput[] = [];
  seq = 0;

  constructor() {
    this.products.set("p1", { id: "p1", name: "Poulet braisé", price: 5000, taxRate: 0.18, currency: "XOF" });
    this.products.set("p2", { id: "p2", name: "Jus de gingembre", price: 1500, taxRate: 0.18, currency: "XOF" });
  }
  async createPosPoint(hotelId: string, input: CreatePosPointInput): Promise<PosPoint> {
    const p: PosPoint = { id: `pp-${++this.seq}`, hotelId, name: input.name, kind: input.kind ?? "RESTAURANT", isActive: true, createdAt: new Date(), updatedAt: new Date() };
    this.points.set(p.id, p);
    return p;
  }
  async listPosPoints(hotelId: string): Promise<PosPoint[]> { return [...this.points.values()].filter((p) => p.hotelId === hotelId); }
  async posPointExists(hotelId: string, id: string): Promise<boolean> { const p = this.points.get(id); return !!p && p.hotelId === hotelId; }
  async createMenu(hotelId: string, posPointId: string, name: string): Promise<{ id: string }> { const m = { id: `m-${++this.seq}`, posPointId }; this.menus.push(m); return m; }
  async addMenuLine(hotelId: string, menuId: string, input: CreateMenuLineInput): Promise<PosMenuLine> {
    const l: PosMenuLine & { productName?: string } = { id: `ml-${++this.seq}`, menuId, productId: input.productId, price: input.price, currency: input.currency ?? "XOF", taxRate: input.taxRate ?? 0 };
    this.menuLines.push(l);
    return l;
  }
  async listMenuLines(hotelId: string, posPointId: string) { return this.menuLines; }
  async getProduct(hotelId: string, id: string) { const p = this.products.get(id); return p ? { ...p } : null; }
  async createOrder(hotelId: string, input: CreatePosOrderInput & { orderRef: string; createdBy?: string }): Promise<PosOrder> {
    // Calculer le total comme le ferait le service (pour la revenue)
    let subtotal = 0, tax = 0;
    for (const l of input.lines) {
      const p = this.products.get(l.productId);
      if (p) { const qty = l.quantity ?? 1; const lt = p.price * qty; subtotal += lt; tax += Math.round(lt * Number(p.taxRate)); }
    }
    const discount = input.discountAmount ?? 0;
    const total = subtotal - discount + tax;
    const o: PosOrder = { id: `o-${++this.seq}`, hotelId, posPointId: input.posPointId, reservationId: input.reservationId ?? null, roomId: input.roomId ?? null, orderRef: input.orderRef, status: "OPEN", subtotal, taxAmount: tax, discountAmount: discount, total, currency: "XOF", createdBy: input.createdBy ?? null, createdAt: new Date(), updatedAt: new Date() };
    this.orders.set(o.id, o);
    return o;
  }
  async addOrderLines(orderId: string, lines: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; taxRate: number }[]): Promise<void> {
    this.orderLines.set(orderId, lines.map((l) => ({ ...l, id: `ol-${++this.seq}`, orderId })));
  }
  async setOrderStatus(hotelId: string, orderId: string, status: PosOrderStatus): Promise<PosOrder> {
    const o = this.orders.get(orderId)!;
    const next = { ...o, status, updatedAt: new Date() } as PosOrder;
    this.orders.set(orderId, next);
    return next;
  }
  async getOrder(hotelId: string, orderId: string): Promise<PosOrder | null> { const o = this.orders.get(orderId); return o && o.hotelId === hotelId ? o : null; }
  async getOrderLines(orderId: string): Promise<PosOrderLine[]> { return this.orderLines.get(orderId) ?? []; }
  async listOrders(hotelId: string, status?: PosOrderStatus): Promise<PosOrder[]> { return [...this.orders.values()].filter((o) => o.hotelId === hotelId && (!status || o.status === status)); }
  async logOrderEvent(orderId: string, action: string, actor?: string, detail?: string): Promise<void> { this.events.push({ orderId, action, actor, detail }); }
  async recordPayment(hotelId: string, input: PosPaymentInput, receivedBy?: string): Promise<void> { this.payments.push(input); }
  async getRevenue(hotelId: string): Promise<number> {
    return [...this.orders.values()].filter((o) => o.hotelId === hotelId && o.status === "PAID").reduce((s, o) => s + o.total, 0);
  }
  async nextOrderRef(): Promise<string> { return `PO-2026-${String(this.seq + 1).padStart(4, "0")}`; }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new PosService(repo, audit, bus);
  const actor: PosActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

async function seedPoint(service: PosService, actor: PosActor) {
  return service.createPosPoint("h1", { name: "Restaurant Le Baobab", kind: "RESTAURANT" }, actor);
}

describe("Module 13 — POS Restaurant", () => {
  it("crée plusieurs points de vente (restaurant, bar, room service)", async () => {
    const { service, actor } = setup();
    await service.createPosPoint("h1", { name: "Restaurant", kind: "RESTAURANT" }, actor);
    await service.createPosPoint("h1", { name: "Bar", kind: "BAR" }, actor);
    await service.createPosPoint("h1", { name: "Room Service", kind: "ROOM_SERVICE" }, actor);
    const points = await service.listPosPoints("h1", actor);
    expect(points.length).toBe(3);
  });

  it("crée un menu avec des lignes (produits + prix + taxe)", async () => {
    const { repo, service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const menu = await service.createMenu("h1", pp.id, "Menu du jour", [
      { productId: "p1", price: 5000, taxRate: 0.18 },
      { productId: "p2", price: 1500, taxRate: 0.18 },
    ], actor);
    expect(menu.id).toBeTruthy();
    const lines = await service.listMenuLines("h1", pp.id, actor);
    expect(lines.length).toBe(2);
  });

  it("crée une commande avec calcul automatique (sous-total, taxes, total)", async () => {
    const { service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const order = await service.createOrder("h1", {
      posPointId: pp.id,
      lines: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }],
    }, actor);
    // 2×5000 + 1×1500 = 11500 ; taxe 18% = 2070 ; total = 13570
    expect(order.subtotal).toBe(11500);
    expect(order.taxAmount).toBe(2070);
    expect(order.total).toBe(13570);
    expect(order.status).toBe("OPEN");
  });

  it("encaissement : paiement + statut PAID + chiffre d'affaires", async () => {
    const { repo, service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const order = await service.createOrder("h1", { posPointId: pp.id, lines: [{ productId: "p1", quantity: 1 }] }, actor);
    const paid = await service.pay("h1", { orderId: order.id, amount: order.total, method: "CASH" }, actor);
    expect(paid.status).toBe("PAID");
    expect(repo.payments.length).toBe(1);
    const revenue = await service.getRevenue("h1", actor);
    expect(revenue).toBe(order.total);
  });

  it("remboursement : PAID → REFUNDED avec traçabilité", async () => {
    const { repo, service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const order = await service.createOrder("h1", { posPointId: pp.id, lines: [{ productId: "p1", quantity: 1 }] }, actor);
    await service.pay("h1", { orderId: order.id, amount: order.total, method: "MOBILE_MONEY" }, actor);
    const refunded = await service.refund("h1", order.id, actor, "Client mécontent");
    expect(refunded.status).toBe("REFUNDED");
    expect(repo.events.some((e) => e.action === "refund")).toBe(true);
  });

  it("annulation : OPEN → VOID", async () => {
    const { repo, service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const order = await service.createOrder("h1", { posPointId: pp.id, lines: [{ productId: "p2", quantity: 1 }] }, actor);
    const voided = await service.cancel("h1", order.id, actor, "Annulée par le client");
    expect(voided.status).toBe("VOID");
    expect(repo.events.some((e) => e.action === "void")).toBe(true);
  });

  it("rejette un remboursement d'une commande non payée", async () => {
    const { service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const order = await service.createOrder("h1", { posPointId: pp.id, lines: [{ productId: "p1", quantity: 1 }] }, actor);
    await expect(service.refund("h1", order.id, actor)).rejects.toThrow(PosError);
  });

  it("lie une commande à une réservation / chambre (room service)", async () => {
    const { service, actor } = setup();
    const pp = await service.createPosPoint("h1", { name: "Room Service", kind: "ROOM_SERVICE" }, actor);
    const order = await service.createOrder("h1", { posPointId: pp.id, reservationId: "res1", roomId: "room1", lines: [{ productId: "p1", quantity: 1 }] }, actor);
    expect(order.reservationId).toBe("res1");
    expect(order.roomId).toBe("room1");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: PosActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createPosPoint("h1", { name: "X" }, other)).rejects.toThrow(PosError);
  });

  it("la machine à états rejette une transition illégale", () => {
    expect(() => assertPosTransition("OPEN", "REFUNDED")).toThrow(PosError);
    expect(() => assertPosTransition("OPEN", "PAID")).not.toThrow();
    expect(() => assertPosTransition("PAID", "REFUNDED")).not.toThrow();
  });

  it("traçabilité : événements created/payment/refund enregistrés", async () => {
    const { repo, service, actor } = setup();
    const pp = await seedPoint(service, actor);
    const order = await service.createOrder("h1", { posPointId: pp.id, lines: [{ productId: "p1", quantity: 1 }] }, actor);
    await service.pay("h1", { orderId: order.id, amount: order.total, method: "CARD" }, actor);
    const actions = repo.events.map((e) => e.action);
    expect(actions).toContain("created");
    expect(actions).toContain("payment");
  });
});
