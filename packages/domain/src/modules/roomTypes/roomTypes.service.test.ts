import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { RoomTypesService, type RoomTypeActor } from "./roomTypes.service.js";
import { RoomTypeError } from "./roomTypes.error.js";
import type { RoomTypesRepository } from "./roomTypes.repository.js";
import type {
  CreateRatePlanInput,
  CreateRoomTypeInput,
  RatePlan,
  RatePlanPrice,
  RatePlanRestrictionInput,
  RoomType,
  UpdateRatePlanInput,
  UpdateRoomTypeInput,
} from "./roomTypes.types.js";

class MemoryRepo implements RoomTypesRepository {
  roomTypes = new Map<string, RoomType>();
  ratePlans = new Map<string, RatePlan & { prices?: Record<string, number>; restrictions?: RatePlanRestrictionInput | null }>();
  seq = 0;

  async createRoomType(hotelId: string, input: CreateRoomTypeInput): Promise<RoomType> {
    const rt: RoomType = {
      id: `rt-${++this.seq}`,
      hotelId,
      name: input.name,
      description: input.description ?? null,
      baseRate: input.baseRate,
      maxOccupancy: input.maxOccupancy ?? 2,
      bedCount: input.bedCount ?? 1,
      amenities: input.amenities ?? [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.roomTypes.set(rt.id, rt);
    return rt;
  }
  async updateRoomType(hotelId: string, id: string, input: UpdateRoomTypeInput): Promise<RoomType> {
    const cur = this.roomTypes.get(id)!;
    const next = { ...cur, ...input, updatedAt: new Date() } as RoomType;
    this.roomTypes.set(id, next);
    return next;
  }
  async setRoomTypeActive(hotelId: string, id: string, isActive: boolean): Promise<RoomType> {
    const cur = this.roomTypes.get(id)!;
    const next = { ...cur, isActive, updatedAt: new Date() };
    this.roomTypes.set(id, next);
    return next;
  }
  async getRoomType(hotelId: string, id: string): Promise<RoomType | null> {
    const rt = this.roomTypes.get(id);
    return rt && rt.hotelId === hotelId ? rt : null;
  }
  async listRoomTypes(hotelId: string, includeInactive = false): Promise<RoomType[]> {
    return [...this.roomTypes.values()].filter((rt) => rt.hotelId === hotelId && (includeInactive || rt.isActive));
  }
  async createRatePlan(hotelId: string, input: CreateRatePlanInput): Promise<RatePlan> {
    const p: RatePlan & { prices?: Record<string, number>; restrictions?: RatePlanRestrictionInput | null } = {
      id: `rp-${++this.seq}`,
      hotelId,
      roomTypeId: input.roomTypeId,
      name: input.name,
      type: input.type ?? "BASE",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ratePlans.set(p.id, p);
    return p;
  }
  async updateRatePlan(hotelId: string, id: string, input: UpdateRatePlanInput): Promise<RatePlan> {
    const cur = this.ratePlans.get(id)!;
    const next: RatePlan & { prices?: Record<string, number>; restrictions?: RatePlanRestrictionInput | null } = { ...cur, updatedAt: new Date() };
    if (input.name !== undefined) next.name = input.name;
    if (input.type !== undefined) next.type = input.type;
    if (input.startDate !== undefined) next.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.endDate !== undefined) next.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.isActive !== undefined) next.isActive = input.isActive;
    if (input.prices !== undefined) next.prices = input.prices;
    this.ratePlans.set(id, next);
    return next;
  }
  async setRatePlanActive(hotelId: string, id: string, isActive: boolean): Promise<RatePlan> {
    const cur = this.ratePlans.get(id)!;
    const next = { ...cur, isActive };
    this.ratePlans.set(id, next);
    return next;
  }
  async getRatePlan(hotelId: string, id: string): Promise<RatePlan | null> {
    const p = this.ratePlans.get(id);
    return p && p.hotelId === hotelId ? p : null;
  }
  async listRatePlans(hotelId: string, roomTypeId?: string): Promise<RatePlan[]> {
    return [...this.ratePlans.values()].filter((p) => p.hotelId === hotelId && (!roomTypeId || p.roomTypeId === roomTypeId));
  }
  async resolvePrice(hotelId: string, roomTypeId: string, currency: string, date: Date): Promise<number> {
    // Priorité : plans actifs couvrant la date, par type ; sinon baseRate.
    const plans = [...this.ratePlans.values()].filter(
      (p) =>
        p.hotelId === hotelId &&
        p.roomTypeId === roomTypeId &&
        p.isActive &&
        (!p.startDate || date >= p.startDate) &&
        (!p.endDate || date <= p.endDate),
    );
    if (plans.length > 0) {
      // prendre le premier plan avec un prix dans la devise demandée
      for (const p of plans) {
        if (p.prices && p.prices[currency] !== undefined) return p.prices[currency]!;
      }
    }
    const rt = this.roomTypes.get(roomTypeId);
    return rt ? rt.baseRate : 0;
  }
  async setRatePlanPrices(ratePlanId: string, prices: Record<string, number>): Promise<void> {
    const p = this.ratePlans.get(ratePlanId)!;
    p.prices = prices;
  }
  async getRatePlanPrices(ratePlanId: string): Promise<RatePlanPrice[]> {
    const p = this.ratePlans.get(ratePlanId);
    return Object.entries(p?.prices ?? {}).map(([currency, amount]) => ({
      id: `${ratePlanId}-${currency}`,
      ratePlanId,
      currency,
      amount,
    }));
  }
  async setRatePlanRestrictions(ratePlanId: string, restrictions?: RatePlanRestrictionInput): Promise<void> {
    const p = this.ratePlans.get(ratePlanId)!;
    p.restrictions = restrictions ?? null;
  }
  async getRatePlanRestrictions(ratePlanId: string): Promise<RatePlanRestrictionInput | null> {
    return this.ratePlans.get(ratePlanId)?.restrictions ?? null;
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new RoomTypesService(repo, audit, bus);
  const actor: RoomTypeActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

const rtInput: CreateRoomTypeInput = {
  name: "Chambre Standard",
  baseRate: 5000,
  maxOccupancy: 2,
  bedCount: 1,
  amenities: ["wifi", "clim"],
};

describe("Module 5 — Types de chambres & tarifs", () => {
  it("crée plusieurs types de chambres par hôtel", async () => {
    const { service, actor } = setup();
    const a = await service.createRoomType("h1", rtInput, actor);
    const b = await service.createRoomType("h1", { ...rtInput, name: "Suite", baseRate: 12000 }, actor);
    expect(a.name).toBe("Chambre Standard");
    expect(b.name).toBe("Suite");
    expect((await service.listRoomTypes("h1", false, actor)).length).toBe(2);
  });

  it("crée plusieurs plans tarifaires par type de chambre (saisons)", async () => {
    const { service, actor } = setup();
    const rt = await service.createRoomType("h1", rtInput, actor);
    await service.createRatePlan("h1", {
      roomTypeId: rt.id,
      name: "Basse saison",
      type: "SEASONAL",
      startDate: "2026-01-01",
      endDate: "2026-04-30",
      prices: { XOF: 4500, EUR: 7 },
    }, actor);
    await service.createRatePlan("h1", {
      roomTypeId: rt.id,
      name: "Haute saison",
      type: "SEASONAL",
      startDate: "2026-12-01",
      endDate: "2026-12-31",
      prices: { XOF: 7000, EUR: 11 },
    }, actor);
    const plans = await service.listRatePlans("h1", rt.id, actor);
    expect(plans.length).toBe(2);
    expect(plans.map((p) => p.name)).toContain("Haute saison");
  });

  it("résout le prix par devise selon la saison (repli baseRate sinon)", async () => {
    const { service, actor } = setup();
    const rt = await service.createRoomType("h1", rtInput, actor); // baseRate 5000
    await service.createRatePlan("h1", {
      roomTypeId: rt.id,
      name: "Haute saison",
      type: "SEASONAL",
      startDate: "2026-12-01",
      endDate: "2026-12-31",
      prices: { XOF: 7000, EUR: 11 },
    }, actor);
    // Dans la saison → 7000 XOF
    expect(await service.resolvePrice("h1", rt.id, "XOF", new Date("2026-12-15"), actor)).toBe(7000);
    // Hors saison → repli baseRate 5000
    expect(await service.resolvePrice("h1", rt.id, "XOF", new Date("2026-06-15"), actor)).toBe(5000);
  });

  it("applique les restrictions (séjour min, capacité) au plan", async () => {
    const { repo, service, actor } = setup();
    const rt = await service.createRoomType("h1", rtInput, actor);
    const plan = await service.createRatePlan("h1", {
      roomTypeId: rt.id,
      name: "Promo",
      type: "PROMOTIONAL",
      prices: { XOF: 4000 },
      restrictions: { minNights: 3, maxGuests: 2 },
    }, actor);
    const rest = await repo.getRatePlanRestrictions(plan.id);
    expect(rest?.minNights).toBe(3);
    expect(rest?.maxGuests).toBe(2);
  });

  it("valide : rejette endDate avant startDate", async () => {
    const { service, actor } = setup();
    const rt = await service.createRoomType("h1", rtInput, actor);
    await expect(
      service.createRatePlan("h1", { roomTypeId: rt.id, name: "Invalide", startDate: "2026-06-01", endDate: "2026-01-01" }, actor),
    ).rejects.toThrow();
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: RoomTypeActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createRoomType("h1", rtInput, other)).rejects.toThrow(RoomTypeError);
  });

  it("isole : un plan ne peut référencer un type d'un autre hôtel", async () => {
    const { service, actor } = setup();
    // Type créé dans h1, mais plan tenté dans h1 avec roomTypeId d'un hôtel inexistant
    const other: RoomTypeActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await service.createRoomType("h2", rtInput, other);
    const rtH1 = await service.createRoomType("h1", rtInput, actor);
    // roomTypeId de h1, acteur h2 → le type n'appartient pas à h2
    await expect(
      service.createRatePlan("h2", { roomTypeId: rtH1.id, name: "X" }, other),
    ).rejects.toThrow(RoomTypeError);
  });

  it("journalise les mutations", async () => {
    const { writer, service, actor } = setup();
    const rt = await service.createRoomType("h1", rtInput, actor);
    await service.createRatePlan("h1", { roomTypeId: rt.id, name: "Plan", prices: { XOF: 5000 } }, actor);
    expect(writer.entries.some((e) => e.action === "roomTypes.create")).toBe(true);
    expect(writer.entries.some((e) => e.action === "roomTypes.rateplan.create")).toBe(true);
  });
});
