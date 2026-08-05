import { describe, it, expect } from "vitest";
import { EventBus, DomainEvents, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import {
  SettingsService,
  SettingsError,
  type SettingsActor,
} from "./settings.service.js";
import type { SettingsRepository } from "./settings.repository.js";
import type {
  HotelSettings,
  HotelSettingsPatch,
  OrganisationSettings,
  OrganisationSettingsPatch,
} from "./settings.types.js";

/** Dépôt mémoire pour les tests. */
class MemoryRepo implements SettingsRepository {
  org: OrganisationSettings;
  hotels: Map<string, HotelSettings>;
  constructor() {
    this.org = { id: "o1", name: "Org Démo", slug: "demo-org" };
    this.hotels = new Map([
      [
        "h1",
        {
          id: "h1",
          organisationId: "o1",
          name: "Hôtel Démo",
          slug: "demo-cotonou",
          code: "DEMO-01",
          currency: "XOF",
          locale: "fr",
          timezone: "Africa/Porto-Novo",
          vatRate: 0.18,
          isActive: true,
        },
      ],
    ]);
  }
  async getOrganisation(id: string) {
    return this.org.id === id ? this.org : null;
  }
  async updateOrganisation(_id: string, patch: OrganisationSettingsPatch) {
    this.org = { ...this.org, ...patch };
    return this.org;
  }
  async getHotel(id: string) {
    return this.hotels.get(id) ?? null;
  }
  async updateHotel(id: string, patch: HotelSettingsPatch) {
    const cur = this.hotels.get(id);
    if (!cur) throw new Error("not found");
    const next = { ...cur, ...patch, updatedAt: new Date() };
    this.hotels.set(id, next);
    return next;
  }
  async listHotelsForOrganisation(id: string) {
    return [...this.hotels.values()].filter((h) => h.organisationId === id);
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new SettingsService(repo, audit, bus);
  const actor: SettingsActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 1 — Paramètres généraux", () => {
  it("lit les réglages d'organisation", async () => {
    const { service } = setup();
    const org = await service.getOrganisation("o1");
    expect(org?.name).toBe("Org Démo");
  });

  it("liste les hôtels de l'organisation", async () => {
    const { service } = setup();
    const hotels = await service.listHotels("o1");
    expect(hotels).toHaveLength(1);
    expect(hotels[0]!.currency).toBe("XOF");
  });

  it("met à jour les réglages d'organisation : valide, audite et émet un événement", async () => {
    const { service, writer, bus, actor } = setup();
    let eventCount = 0;
    bus.subscribe(DomainEvents.settingsChanged, () => {
      eventCount += 1;
    });

    const updated = await service.updateOrganisation("o1", { name: "Nouveau Nom" }, actor);

    expect(updated.name).toBe("Nouveau Nom");
    expect(eventCount).toBe(1);
    expect(writer.entries.some((e) => e.action === "settings.organisation.update")).toBe(true);
  });

  it("met à jour les réglages d'un hôtel", async () => {
    const { service, writer, actor } = setup();
    const updated = await service.updateHotelSettings("h1", { vatRate: 0.19, currency: "NGN" }, actor);
    expect(updated.vatRate).toBe(0.19);
    expect(updated.currency).toBe("NGN");
    expect(writer.entries.some((e) => e.action === "settings.hotel.update")).toBe(true);
  });

  it("rejette une devise invalide (ISO 4217)", async () => {
    const { service, actor } = setup();
    await expect(service.updateHotelSettings("h1", { currency: "xof" }, actor)).rejects.toThrow();
    await expect(service.updateHotelSettings("h1", { currency: "XYZ1" }, actor)).rejects.toThrow();
  });

  it("rejette un taux de taxe hors de [0,1]", async () => {
    const { service, actor } = setup();
    await expect(service.updateHotelSettings("h1", { vatRate: 1.5 }, actor)).rejects.toThrow();
  });

  it("rejette un fuseau horaire invalide", async () => {
    const { service, actor } = setup();
    await expect(service.updateHotelSettings("h1", { timezone: "Not/AZone" }, actor)).rejects.toThrow();
  });

  it("rejette un accès inter-hôtel (isolation multitenant)", async () => {
    const { service, actor } = setup();
    await expect(service.getHotelSettings("h999", actor)).rejects.toThrow(SettingsError);
    await expect(service.updateHotelSettings("h999", { name: "x" }, actor)).rejects.toThrow(SettingsError);
  });

  it("ne modifie pas si le nom est vide", async () => {
    const { service, actor } = setup();
    await expect(service.updateOrganisation("o1", { name: "   " }, actor)).rejects.toThrow();
  });
});
