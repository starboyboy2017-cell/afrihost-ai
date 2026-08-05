import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { GuestsService, type GuestActor } from "./guests.service.js";
import { GuestError } from "./guests.error.js";
import type { GuestsRepository } from "./guests.repository.js";
import type {
  CreateGuestInput,
  Guest,
  GuestFilter,
  GuestPage,
  GuestStay,
  UpdateGuestInput,
} from "./guests.types.js";

class MemoryRepo implements GuestsRepository {
  guests = new Map<string, Guest>();
  stays = new Map<string, GuestStay[]>();
  seq = 0;

  async createGuest(organisationId: string, hotelId: string, input: CreateGuestInput): Promise<Guest> {
    const g: Guest = {
      id: `guest-${++this.seq}`,
      organisationId,
      hotelId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      nationality: input.nationality ?? null,
      idDocument: input.idDocument ?? null,
      idDocumentType: input.idDocumentType ?? null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      tags: input.tags ?? [],
      isVip: input.isVip ?? false,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.guests.set(g.id, g);
    return g;
  }
  async updateGuest(hotelId: string, id: string, input: UpdateGuestInput): Promise<Guest> {
    const cur = this.guests.get(id)!;
    const next = { ...cur, ...input, updatedAt: new Date() } as Guest;
    if (input.birthDate) next.birthDate = new Date(input.birthDate);
    this.guests.set(id, next);
    return next;
  }
  async archiveGuest(hotelId: string, id: string, archivedAt?: Date): Promise<Guest> {
    const cur = this.guests.get(id)!;
    const next = { ...cur, archivedAt: archivedAt ?? new Date() } as Guest;
    this.guests.set(id, next);
    return next;
  }
  async getGuest(hotelId: string, id: string): Promise<Guest | null> {
    const g = this.guests.get(id);
    return g && g.hotelId === hotelId ? g : null;
  }
  async searchGuests(filter: GuestFilter): Promise<GuestPage> {
    let list = [...this.guests.values()].filter((g) => g.hotelId === filter.hotelId);
    if (!filter.includeArchived) list = list.filter((g) => !g.archivedAt);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (g) =>
          g.firstName.toLowerCase().includes(q) ||
          g.lastName.toLowerCase().includes(q) ||
          (g.email ?? "").toLowerCase().includes(q) ||
          (g.phone ?? "").includes(q) ||
          (g.idDocument ?? "").toLowerCase().includes(q),
      );
    }
    const total = list.length;
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    return { guests: list.slice(offset, offset + limit), total };
  }
  async listGuestStays(hotelId: string, guestId: string): Promise<GuestStay[]> {
    return this.stays.get(guestId) ?? [];
  }
  async findByEmail(organisationId: string, email: string): Promise<Guest | null> {
    return (
      [...this.guests.values()].find(
        (g) => g.organisationId === organisationId && (g.email ?? "").toLowerCase() === email.toLowerCase() && !g.archivedAt,
      ) ?? null
    );
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new GuestsService(repo, audit, bus);
  const actor: GuestActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

const base: CreateGuestInput = {
  firstName: "Awa",
  lastName: "Kouassi",
  email: "awa@test.local",
  phone: "+22901010101",
  nationality: "BJ",
  idDocument: "P-123456",
  idDocumentType: "PASSPORT",
};

describe("Module Guests — Clients", () => {
  it("crée un client et journalise", async () => {
    const { service, writer, actor } = setup();
    const g = await service.createGuest("h1", base, actor);
    expect(g.firstName).toBe("Awa");
    expect(g.id.startsWith("guest-")).toBe(true);
    expect(writer.entries.some((e) => e.action === "guests.create")).toBe(true);
  });

  it("détecte un doublon par email", async () => {
    const { service, actor } = setup();
    await service.createGuest("h1", base, actor);
    await expect(service.createGuest("h1", { ...base, firstName: "Autre" }, actor)).rejects.toThrow(
      /existe déjà/,
    );
  });

  it("modifie un client", async () => {
    const { service, writer, actor } = setup();
    const g = await service.createGuest("h1", base, actor);
    const updated = await service.updateGuest("h1", g.id, { phone: "+22907070707", isVip: true }, actor);
    expect(updated.phone).toBe("+22907070707");
    expect(updated.isVip).toBe(true);
    expect(writer.entries.some((e) => e.action === "guests.update")).toBe(true);
  });

  it("archive un client (soft-delete)", async () => {
    const { service, actor } = setup();
    const g = await service.createGuest("h1", base, actor);
    await service.archiveGuest("h1", g.id, actor);
    // Un client archivé n'apparaît plus dans la recherche par défaut
    const page = await service.search("h1", { search: "Awa" }, actor);
    expect(page.total).toBe(0);
    // Mais apparaît si includeArchived
    const withArchived = await service.search("h1", { search: "Awa", includeArchived: true }, actor);
    expect(withArchived.total).toBe(1);
  });

  it("recherche rapide par email et téléphone", async () => {
    const { service, actor } = setup();
    await service.createGuest("h1", base, actor);
    await service.createGuest("h1", { ...base, email: "b@test.local", firstName: "Benoit", lastName: "Zinsou", phone: "+22908080808" }, actor);
    expect((await service.search("h1", { search: "awa@test" }, actor)).total).toBe(1);
    expect((await service.search("h1", { search: "080808" }, actor)).total).toBe(1);
    expect((await service.search("h1", { search: "Benoit" }, actor)).total).toBe(1);
  });

  it("renvoie l'historique des séjours", async () => {
    const { repo, service, actor } = setup();
    const g = await service.createGuest("h1", base, actor);
    repo.stays.set(g.id, [
      { reservationId: "r1", bookingRef: "AH-2026-00001", arrivalDate: new Date("2026-08-01"), departureDate: new Date("2026-08-03"), status: "CHECKED_OUT" },
    ]);
    const stays = await service.stays("h1", g.id, actor);
    expect(stays.length).toBe(1);
    expect(stays[0]!.status).toBe("CHECKED_OUT");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: GuestActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createGuest("h1", base, other)).rejects.toThrow(GuestError);
  });

  it("rejette une saisie sans nom", async () => {
    const { service, actor } = setup();
    await expect(service.createGuest("h1", { firstName: "", lastName: "" }, actor)).rejects.toThrow();
  });

  it("rejette un email invalide", async () => {
    const { service, actor } = setup();
    await expect(service.createGuest("h1", { ...base, email: "invalide" }, actor)).rejects.toThrow();
  });
});
