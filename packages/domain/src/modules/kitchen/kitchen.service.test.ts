import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { KitchenService, type KitchenActor } from "./kitchen.service.js";
import { KitchenError } from "./kitchen.error.js";
import { assertKitchenTransition } from "./kitchen.state.js";
import type { KitchenRepository } from "./kitchen.repository.js";
import type {
  CreateKitchenOrderInput,
  CreateStationInput,
  KitchenFilter,
  KitchenOrder,
  KitchenOrderLine,
  KitchenOrderStatus,
  KitchenStation,
} from "./kitchen.types.js";

type StoredOrder = KitchenOrder & { lines: KitchenOrderLine[]; events: string[] };

class MemoryRepo implements KitchenRepository {
  stations = new Map<string, KitchenStation>();
  orders = new Map<string, StoredOrder>();
  posLines = new Map<string, { productId: string; productName: string; quantity: number }[]>();
  seq = 0;

  constructor() {
    this.posLines.set("pos1", [
      { productId: "p1", productName: "Poulet braisé", quantity: 2 },
      { productId: "p2", productName: "Attiéké", quantity: 1 },
    ]);
  }
  async createStation(hotelId: string, input: CreateStationInput): Promise<KitchenStation> {
    const s: KitchenStation = { id: `st-${++this.seq}`, hotelId, name: input.name, createdAt: new Date(), updatedAt: new Date() };
    this.stations.set(s.id, s);
    return s;
  }
  async listStations(hotelId: string): Promise<KitchenStation[]> { return [...this.stations.values()].filter((s) => s.hotelId === hotelId); }
  async stationExists(hotelId: string, id: string): Promise<boolean> { const s = this.stations.get(id); return !!s && s.hotelId === hotelId; }
  async createOrder(hotelId: string, input: CreateKitchenOrderInput & { kitchenRef: string }): Promise<KitchenOrder> {
    const o: StoredOrder = { id: `ko-${++this.seq}`, hotelId, posOrderId: input.posOrderId, stationId: input.stationId, kitchenRef: input.kitchenRef, status: "NEW", priority: input.priority ?? "MEDIUM", notes: input.notes ?? null, posPointId: input.posPointId ?? null, reservationId: input.reservationId ?? null, roomId: input.roomId ?? null, receivedAt: new Date(), lines: [], events: [], createdAt: new Date(), updatedAt: new Date() };
    this.orders.set(o.id, o);
    return o;
  }
  async getOrder(hotelId: string, id: string): Promise<KitchenOrder | null> { const o = this.orders.get(id); return o && o.hotelId === hotelId ? o : null; }
  async getOrderLines(id: string): Promise<KitchenOrderLine[]> { return this.orders.get(id)?.lines ?? []; }
  async setOrderStatus(hotelId: string, id: string, status: KitchenOrderStatus, actor?: string): Promise<KitchenOrder> {
    const o = this.orders.get(id)!;
    const next = { ...o, status, updatedAt: new Date() } as StoredOrder;
    if (status === "PREPARING") next.startedAt = new Date();
    if (status === "READY") next.readyAt = new Date();
    if (status === "SERVED") next.servedAt = new Date();
    this.orders.set(id, next);
    return next;
  }
  async listOrders(filter: KitchenFilter): Promise<{ orders: KitchenOrder[]; total: number }> {
    let list = [...this.orders.values()].filter((o) => o.hotelId === filter.hotelId);
    if (filter.stationId) list = list.filter((o) => o.stationId === filter.stationId);
    if (filter.status) list = list.filter((o) => o.status === filter.status);
    if (filter.priority) list = list.filter((o) => o.priority === filter.priority);
    return { orders: list, total: list.length };
  }
  async addOrderLines(id: string, lines: { productId: string; productName: string; quantity: number; note?: string | null }[]): Promise<void> {
    const o = this.orders.get(id)!;
    o.lines = lines.map((l) => ({ id: `l${++this.seq}`, kitchenOrderId: id, productId: l.productId, productName: l.productName, quantity: l.quantity, note: l.note ?? null, status: "NEW" }));
  }
  async setLineStatus(id: string, lineId: string, status: KitchenOrderLine["status"]): Promise<void> {
    const o = this.orders.get(id)!;
    const line = o.lines.find((l) => l.id === lineId);
    if (line) line.status = status;
  }
  async logOrderEvent(id: string, action: string, actor?: string, detail?: string): Promise<void> {
    const o = this.orders.get(id);
    if (o) o.events.push(action);
  }
  async getPosOrderLines(posOrderId: string) { return this.posLines.get(posOrderId) ?? []; }
  async nextKitchenRef(): Promise<string> { return `KO-2026-${String(this.seq + 1).padStart(4, "0")}`; }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new KitchenService(repo, audit, bus);
  const actor: KitchenActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 14 — Cuisine", () => {
  it("crée plusieurs postes de cuisine", async () => {
    const { service, actor } = setup();
    await service.createStation("h1", { name: "Grillard" }, actor);
    await service.createStation("h1", { name: "Plats" }, actor);
    const stations = await service.listStations("h1", actor);
    expect(stations.length).toBe(2);
  });

  it("réceptionne une commande POS et crée un ordre NEW avec les lignes", async () => {
    const { repo, service, actor } = setup();
    const st = await service.createStation("h1", { name: "Grillard" }, actor);
    const order = await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st.id }, actor);
    expect(order.status).toBe("NEW");
    expect(order.kitchenRef).toMatch(/^KO-2026-/);
    const lines = repo.orders.get(order.id)!.lines;
    expect(lines.length).toBe(2);
    expect(lines.some((l) => l.productName === "Poulet braisé")).toBe(true);
  });

  it("répartit par poste : un ordre sur un poste d'un autre hôtel est refusé", async () => {
    const { service, actor } = setup();
    await expect(service.receiveOrder("h1", { posOrderId: "pos1", stationId: "st-999" }, actor)).rejects.toThrow(/introuvable/);
  });

  it("déroule le cycle complet NEW→PREPARING→READY→SERVED avec horodatage", async () => {
    const { repo, service, actor } = setup();
    const st = await service.createStation("h1", { name: "Grillard" }, actor);
    const order = await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st.id }, actor);
    await service.transition("h1", order.id, "PREPARING", actor);
    const ready = await service.transition("h1", order.id, "READY", actor);
    expect(ready.readyAt).toBeTruthy();
    const served = await service.transition("h1", order.id, "SERVED", actor);
    expect(served.status).toBe("SERVED");
  });

  it("gère les modifications (MODIFIED) et annulations (CANCELLED)", async () => {
    const { repo, service, actor } = setup();
    const st = await service.createStation("h1", { name: "Grillard" }, actor);
    const order = await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st.id }, actor);
    const modified = await service.markModified("h1", order.id, actor, "Sans piment");
    expect(modified.status).toBe("MODIFIED");
    await service.transition("h1", order.id, "PREPARING", actor);
    const cancelled = await service.cancel("h1", order.id, actor, "Plus de stock");
    expect(cancelled.status).toBe("CANCELLED");
    const events = repo.orders.get(order.id)!.events;
    expect(events).toContain("modified");
    expect(events).toContain("cancelled");
  });

  it("gère les priorités (URGENT pour un room service express)", async () => {
    const { service, actor } = setup();
    const st = await service.createStation("h1", { name: "Room Service" }, actor);
    const order = await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st.id, priority: "URGENT", roomId: "room1" }, actor);
    expect(order.priority).toBe("URGENT");
    expect(order.roomId).toBe("room1");
  });

  it("rejette une transition illégale (SERVED → PREPARING)", async () => {
    const { service, actor } = setup();
    const st = await service.createStation("h1", { name: "Grillard" }, actor);
    const order = await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st.id }, actor);
    await service.transition("h1", order.id, "PREPARING", actor);
    await service.transition("h1", order.id, "READY", actor);
    await service.transition("h1", order.id, "SERVED", actor);
    await expect(service.transition("h1", order.id, "PREPARING", actor)).rejects.toThrow(/illégale/);
  });

  it("filtre par statut et par poste", async () => {
    const { service, actor } = setup();
    const st1 = await service.createStation("h1", { name: "Grillard" }, actor);
    const st2 = await service.createStation("h1", { name: "Plats" }, actor);
    await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st1.id }, actor);
    await service.receiveOrder("h1", { posOrderId: "pos1", stationId: st2.id }, actor);
    const byStation = await service.listOrders("h1", { stationId: st1.id }, actor);
    expect(byStation.total).toBe(1);
    const byStatus = await service.listOrders("h1", { status: "NEW" }, actor);
    expect(byStatus.total).toBe(2);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: KitchenActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createStation("h1", { name: "X" }, other)).rejects.toThrow(KitchenError);
  });

  it("la machine à états autorise le cycle", () => {
    expect(() => assertKitchenTransition("NEW", "PREPARING")).not.toThrow();
    expect(() => assertKitchenTransition("PREPARING", "READY")).not.toThrow();
    expect(() => assertKitchenTransition("READY", "SERVED")).not.toThrow();
    expect(() => assertKitchenTransition("NEW", "CANCELLED")).not.toThrow();
  });
});
