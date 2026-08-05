import { describe, it, expect } from "vitest";
import { EventBus, DomainEvents, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { HotelsService, type HotelActor } from "./hotels.service.js";
import { HotelsError } from "./hotels.error.js";
import type { HotelsRepository } from "./hotels.repository.js";
import type {
  CreateHotelInput,
  Hotel,
  HotelSummary,
  MembershipAssignment,
  UpdateHotelInput,
} from "./hotels.types.js";

/** Dépôt mémoire pour tests. */
class MemoryRepo implements HotelsRepository {
  hotels = new Map<string, Hotel>();
  memberships: { userId: string; hotelId: string; roleCode: string }[] = [];
  roleByCode = new Map<string, string>([["HOTEL_OWNER", "r-owner"], ["FRONT_DESK", "r-fd"]]);
  private seq = 0;

  async createHotel(organisationId: string, input: CreateHotelInput): Promise<Hotel> {
    const h: Hotel = {
      id: `hotel-${++this.seq}`,
      organisationId,
      name: input.name,
      slug: input.slug,
      code: input.code,
      currency: input.currency ?? "XOF",
      locale: input.locale ?? "fr",
      timezone: input.timezone ?? "Africa/Porto-Novo",
      vatRate: input.vatRate ?? 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.hotels.set(h.id, h);
    return h;
  }
  async updateHotel(hotelId: string, input: UpdateHotelInput): Promise<Hotel> {
    const cur = this.hotels.get(hotelId);
    if (!cur) throw new Error("not found");
    const next = { ...cur, ...input, updatedAt: new Date() } as Hotel;
    this.hotels.set(hotelId, next);
    return next;
  }
  async setHotelActive(hotelId: string, isActive: boolean): Promise<Hotel> {
    const cur = this.hotels.get(hotelId);
    if (!cur) throw new Error("not found");
    const next = { ...cur, isActive, updatedAt: new Date() };
    this.hotels.set(hotelId, next);
    return next;
  }
  async getHotel(hotelId: string) {
    return this.hotels.get(hotelId) ?? null;
  }
  async getHotelBySlug(slug: string) {
    return [...this.hotels.values()].find((h) => h.slug === slug) ?? null;
  }
  async getHotelByCode(code: string) {
    return [...this.hotels.values()].find((h) => h.code === code) ?? null;
  }
  async listHotelsForOrganisation(organisationId: string) {
    return [...this.hotels.values()].filter((h) => h.organisationId === organisationId);
  }
  async listHotelsForUser(userId: string): Promise<HotelSummary[]> {
    return this.memberships
      .filter((m) => m.userId === userId)
      .map((m) => {
        const h = this.hotels.get(m.hotelId)!;
        return { id: h.id, name: h.name, slug: h.slug, code: h.code, currency: h.currency, isActive: h.isActive, roleCode: m.roleCode };
      });
  }
  async findRoleIdByCode(organisationId: string, roleCode: string) {
    void organisationId;
    return this.roleByCode.get(roleCode) ?? null;
  }
  async assignMembership(a: MembershipAssignment): Promise<void> {
    this.memberships.push({ userId: a.userId, hotelId: a.hotelId, roleCode: a.roleCode });
  }
  async ensureOwnerMembership(userId: string, hotelId: string, roleId: string): Promise<void> {
    const code = [...this.roleByCode.entries()].find(([, v]) => v === roleId)?.[0] ?? "HOTEL_OWNER";
    this.memberships.push({ userId, hotelId, roleCode: code });
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new HotelsService(repo, audit, bus);
  const actor: HotelActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

const baseInput: CreateHotelInput = {
  name: "Hôtel Dakar",
  slug: "dakar-01",
  code: "DKR-01",
  currency: "XOF",
  locale: "fr",
  timezone: "Africa/Dakar",
  vatRate: 0.18,
};

describe("Module 2 — Gestion multihôtels", () => {
  it("crée un hôtel, émet un événement et journalise", async () => {
    const { service, writer, bus, actor } = setup();
    let eventCount = 0;
    bus.subscribe(DomainEvents.hotelCreated, () => {
      eventCount += 1;
    });

    const hotel = await service.createHotel("o1", baseInput, actor, "u1");

    expect(hotel.name).toBe("Hôtel Dakar");
    expect(hotel.isActive).toBe(true);
    expect(eventCount).toBe(1);
    expect(writer.entries.some((e) => e.action === "hotels.create")).toBe(true);
  });

  it("rejette un slug en double", async () => {
    const { service, actor } = setup();
    await service.createHotel("o1", baseInput, actor, "u1");
    await expect(service.createHotel("o1", { ...baseInput, code: "DKR-02" }, actor, "u1")).rejects.toThrow(
      HotelsError,
    );
  });

  it("rejette un code en double", async () => {
    const { service, actor } = setup();
    await service.createHotel("o1", baseInput, actor, "u1");
    await expect(
      service.createHotel("o1", { ...baseInput, slug: "autre", code: "DKR-01" }, actor, "u1"),
    ).rejects.toThrow(HotelsError);
  });

  it("modifie un hôtel", async () => {
    const { service, writer, actor } = setup();
    const h = await service.createHotel("o1", baseInput, actor, "u1");
    const updated = await service.updateHotel(h.id, { vatRate: 0.2, city: "Dakar" }, { ...actor, hotelId: h.id });
    expect(updated.vatRate).toBe(0.2);
    expect(updated.city).toBe("Dakar");
    expect(writer.entries.some((e) => e.action === "hotels.update")).toBe(true);
  });

  it("désactive puis réactive un hôtel", async () => {
    const { service, actor } = setup();
    const h = await service.createHotel("o1", baseInput, actor, "u1");
    const ownerActor = { ...actor, hotelId: h.id };
    expect((await service.deactivateHotel(h.id, ownerActor)).isActive).toBe(false);
    expect((await service.reactivateHotel(h.id, ownerActor)).isActive).toBe(true);
  });

  it("isole : refuse un accès inter-hôtel (tenant différent de l'hôtel ciblé)", async () => {
    const { service, actor } = setup();
    const h = await service.createHotel("o1", baseInput, actor, "u1");
    const otherActor: HotelActor = { organisationId: "o1", hotelId: "hotel-999", actorUserId: "u1" };
    await expect(service.updateHotel(h.id, { name: "x" }, otherActor)).rejects.toThrow(HotelsError);
  });

  it("rejette une devise invalide à la création", async () => {
    const { service, actor } = setup();
    await expect(
      service.createHotel("o1", { ...baseInput, currency: "xof" }, actor, "u1"),
    ).rejects.toThrow();
  });

  it("le créateur devient propriétaire (per-hotel RBAC) et l'hôtel apparaît au sélecteur", async () => {
    const { service, actor } = setup();
    const h = await service.createHotel("o1", baseInput, actor, "u1");
    const userHotels = await service.listHotelsForUser("u1");
    expect(userHotels.some((s) => s.id === h.id && s.roleCode === "HOTEL_OWNER")).toBe(true);
  });

  it("affecte un rôle par hôtel à un utilisateur", async () => {
    const { service, writer, actor } = setup();
    const h = await service.createHotel("o1", baseInput, actor, "u1");
    const ownerActor = { ...actor, hotelId: h.id };
    await service.assignRoleToUser("u2", h.id, "FRONT_DESK", ownerActor);
    const userHotels = await service.listHotelsForUser("u2");
    expect(userHotels.some((s) => s.id === h.id && s.roleCode === "FRONT_DESK")).toBe(true);
    expect(writer.entries.some((e) => e.action === "hotels.assign_role")).toBe(true);
  });

  it("rejette un rôle inconnu à l'affectation", async () => {
    const { service, actor } = setup();
    const h = await service.createHotel("o1", baseInput, actor, "u1");
    const ownerActor = { ...actor, hotelId: h.id };
    await expect(service.assignRoleToUser("u2", h.id, "NO_ROLE", ownerActor)).rejects.toThrow(HotelsError);
  });
});
