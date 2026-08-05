import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { LaundryService, type LaundryActor } from "./laundry.service.js";
import { LaundryError } from "./laundry.error.js";
import { assertLaundryTransition } from "./laundry.state.js";
import type { LaundryRepository, LaundryStock } from "./laundry.repository.js";
import type {
  CreateBatchInput,
  CreateItemInput,
  CreateItemTypeInput,
  CreateLossInput,
  LaundryBatch,
  LaundryFilter,
  LaundryItem,
  LaundryItemType,
  LaundryLoss,
  LaundryState,
} from "./laundry.types.js";

type StoredItem = LaundryItem;

class MemoryRepo implements LaundryRepository {
  types = new Map<string, LaundryItemType>();
  items = new Map<string, StoredItem>();
  batches: LaundryBatch[] = [];
  losses: LaundryLoss[] = [];
  seq = 0;

  async createItemType(hotelId: string, input: CreateItemTypeInput): Promise<LaundryItemType> {
    const t: LaundryItemType = { id: `lt-${++this.seq}`, hotelId, name: input.name, unit: input.unit ?? null };
    this.types.set(t.id, t);
    return t;
  }
  async listItemTypes(hotelId: string): Promise<LaundryItemType[]> {
    return [...this.types.values()].filter((t) => t.hotelId === hotelId);
  }
  async itemTypeExists(hotelId: string, itemTypeId: string): Promise<boolean> {
    const t = this.types.get(itemTypeId);
    return !!t && t.hotelId === hotelId;
  }
  async createItem(hotelId: string, input: CreateItemInput): Promise<LaundryItem> {
    const i: StoredItem = { id: `li-${++this.seq}`, hotelId, itemTypeId: input.itemTypeId, code: input.code ?? null, state: "CLEAN", createdAt: new Date(), updatedAt: new Date() };
    this.items.set(i.id, i);
    return i;
  }
  async getItem(hotelId: string, id: string): Promise<LaundryItem | null> {
    const i = this.items.get(id);
    return i && i.hotelId === hotelId ? i : null;
  }
  async setItemState(hotelId: string, id: string, state: LaundryState, roomId?: string | null): Promise<LaundryItem> {
    const cur = this.items.get(id)!;
    const next = { ...cur, state, roomId: roomId ?? cur.roomId, updatedAt: new Date() } as StoredItem;
    this.items.set(id, next);
    return next;
  }
  async setItemsState(itemIds: string[], state: LaundryState, roomId?: string | null): Promise<number> {
    let n = 0;
    for (const id of itemIds) {
      const cur = this.items.get(id);
      if (cur) { cur.state = state; this.items.set(id, { ...cur }); n++; }
    }
    return n;
  }
  async listItems(filter: LaundryFilter): Promise<{ items: LaundryItem[]; total: number }> {
    let list = [...this.items.values()].filter((i) => i.hotelId === filter.hotelId);
    if (filter.state) list = list.filter((i) => i.state === filter.state);
    if (filter.itemTypeId) list = list.filter((i) => i.itemTypeId === filter.itemTypeId);
    return { items: list, total: list.length };
  }
  async getStock(hotelId: string): Promise<LaundryStock[]> {
    const map = new Map<string, LaundryStock>();
    for (const i of this.items.values()) {
      if (i.hotelId !== hotelId) continue;
      const t = this.types.get(i.itemTypeId);
      const name = t?.name ?? i.itemTypeId;
      const e = map.get(i.itemTypeId) ?? { itemTypeId: i.itemTypeId, name, clean: 0, total: 0 };
      e.total++;
      if (i.state === "CLEAN") e.clean++;
      map.set(i.itemTypeId, e);
    }
    return [...map.values()];
  }
  async softDeleteItem(hotelId: string, id: string): Promise<void> {
    this.items.delete(id);
  }
  async createBatch(hotelId: string, input: CreateBatchInput): Promise<LaundryBatch> {
    const b: LaundryBatch = { id: `lb-${++this.seq}`, hotelId, code: `LB-2026-${this.seq}`, mode: input.mode, providerName: input.providerName ?? null, responsible: input.responsible ?? null, cost: input.cost ?? null, currency: input.currency ?? null, notes: input.notes ?? null, startedAt: new Date() };
    this.batches.push(b);
    return b;
  }
  async completeBatch(hotelId: string, id: string): Promise<LaundryBatch> {
    const b = this.batches.find((x) => x.id === id)!;
    b.completedAt = new Date();
    return b;
  }
  async getBatch(hotelId: string, id: string): Promise<LaundryBatch | null> {
    return this.batches.find((x) => x.id === id && x.hotelId === hotelId) ?? null;
  }
  async listBatches(hotelId: string): Promise<LaundryBatch[]> {
    return this.batches.filter((x) => x.hotelId === hotelId);
  }
  async createLoss(hotelId: string, input: CreateLossInput): Promise<LaundryLoss> {
    const l: LaundryLoss = { id: `ll-${++this.seq}`, hotelId, itemId: input.itemId, reason: input.reason, note: input.note ?? null, costValue: input.costValue ?? null, createdAt: new Date() };
    this.losses.push(l);
    return l;
  }
  async listLosses(hotelId: string): Promise<LaundryLoss[]> {
    return this.losses.filter((x) => x.hotelId === hotelId);
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new LaundryService(repo, audit, bus);
  const actor: LaundryActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

async function seed(repo: MemoryRepo, service: LaundryService, actor: LaundryActor) {
  const t = await service.createItemType("h1", { name: "Serviette", unit: "pièce" }, actor);
  const i1 = await service.addItem("h1", { itemTypeId: t.id, code: "SV-001" }, actor);
  const i2 = await service.addItem("h1", { itemTypeId: t.id, code: "SV-002" }, actor);
  return { t, i1, i2 };
}

describe("Module 11 — Blanchisserie", () => {
  it("crée un type de linge et des pièces CLEAN", async () => {
    const { repo, service, actor } = setup();
    const t = await service.createItemType("h1", { name: "Drap" }, actor);
    const i = await service.addItem("h1", { itemTypeId: t.id }, actor);
    expect(i.state).toBe("CLEAN");
    expect(repo.items.size).toBe(1);
  });

  it("refuse une pièce sur un type d'un autre hôtel", async () => {
    const { service, actor } = setup();
    await expect(service.addItem("h1", { itemTypeId: "lt-999" }, actor)).rejects.toThrow(/introuvable/);
  });

  it("déroule le cycle complet du linge", async () => {
    const { repo, service, actor } = setup();
    const { t, i1 } = await seed(repo, service, actor);
    await service.changeState("h1", i1.id, "DISTRIBUTED", actor, "room1");
    expect(repo.items.get(i1.id)!.state).toBe("DISTRIBUTED");
    await service.changeState("h1", i1.id, "USED", actor);
    await service.changeState("h1", i1.id, "DIRTY", actor);
    const batch = await service.createBatch("h1", { mode: "INTERNAL", itemIds: [i1.id] }, actor);
    expect(batch.mode).toBe("INTERNAL");
    // Après création du lot, la pièce passe WASHING
    expect(repo.items.get(i1.id)!.state).toBe("WASHING");
    await service.completeBatch("h1", batch.id, actor);
    void t;
  });

  it("enregistre une perte/détérioration et retire la pièce du stock", async () => {
    const { repo, service, actor } = setup();
    const { t, i1 } = await seed(repo, service, actor);
    await service.registerLoss("h1", { itemId: i1.id, reason: "DAMAGED", costValue: 2000 }, actor);
    expect(repo.items.has(i1.id)).toBe(false);
    expect(repo.losses.length).toBe(1);
    void t;
  });

  it("calcule le stock par type (comptage CLEAN vs total)", async () => {
    const { repo, service, actor } = setup();
    await seed(repo, service, actor);
    // distribuer une pièce pour qu'elle ne soit plus CLEAN
    const i1 = [...repo.items.values()][0]!;
    await service.changeState("h1", i1.id, "DIRTY", actor);
    const stock = await service.getStock("h1", actor);
    expect(stock.length).toBe(1);
    expect(stock[0]!.total).toBe(2);
    expect(stock[0]!.clean).toBe(1); // une seule reste CLEAN
  });

  it("rejette une transition d'état illégale", async () => {
    const { service, actor } = setup();
    const i = await service.addItem("h1", { itemTypeId: "lt-x" }, actor).catch(() => null);
    void i;
    // On teste via la machine à états directement
    expect(() => assertLaundryTransition("CLEAN", "WASHING")).toThrow(LaundryError);
    expect(() => assertLaundryTransition("DIRTY", "CLEAN")).not.toThrow();
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: LaundryActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createItemType("h1", { name: "X" }, other)).rejects.toThrow(LaundryError);
  });

  it("crée un lot externe avec prestataire et coût", async () => {
    const { repo, service, actor } = setup();
    const batch = await service.createBatch("h1", { mode: "EXTERNAL", providerName: "Laverie Pro", cost: 15000, currency: "XOF" }, actor);
    expect(batch.mode).toBe("EXTERNAL");
    expect(batch.providerName).toBe("Laverie Pro");
    expect(batch.cost).toBe(15000);
  });
});
