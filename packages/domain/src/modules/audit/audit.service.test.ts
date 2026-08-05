import { describe, it, expect } from "vitest";
import { AuditService, toCsv, type AuditActor } from "./audit.service.js";
import type { AuditReadRepository } from "./audit.repository.js";
import type { AuditFilter, AuditLogEntry, AuditPage } from "./audit.types.js";

const entries: AuditLogEntry[] = [
  { id: "1", organisationId: "o1", hotelId: "h1", action: "reservations.create", entityType: "Reservation", entityId: "r1", after: { status: "PROVISIONAL" }, createdAt: new Date("2026-08-01T10:00:00Z") },
  { id: "2", organisationId: "o1", hotelId: "h1", action: "reservations.checkin", entityType: "Reservation", entityId: "r1", after: { status: "CHECKED_IN" }, createdAt: new Date("2026-08-02T10:00:00Z") },
  { id: "3", organisationId: "o1", hotelId: "h2", action: "settings.hotel.update", entityType: "Hotel", entityId: "h2", createdAt: new Date("2026-08-03T10:00:00Z") },
];

class MemoryAuditRepo implements AuditReadRepository {
  constructor(private readonly data: AuditLogEntry[]) {}
  async query(filter: AuditFilter): Promise<AuditPage> {
    let rows = this.data.filter((e) => {
      if (filter.organisationId && e.organisationId !== filter.organisationId) return false;
      if (filter.hotelId && e.hotelId !== filter.hotelId) return false;
      if (filter.action && e.action !== filter.action) return false;
      if (filter.entityType && e.entityType !== filter.entityType) return false;
      if (filter.entityId && e.entityId !== filter.entityId) return false;
      if (filter.actorUserId && e.actorUserId !== filter.actorUserId) return false;
      if (filter.from && e.createdAt < filter.from) return false;
      if (filter.to && e.createdAt > filter.to) return false;
      return true;
    });
    const total = rows.length;
    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    rows = rows.slice(offset, offset + limit);
    return { entries: rows, total };
  }
}

function setup() {
  const repo = new MemoryAuditRepo(entries);
  const service = new AuditService(repo);
  return { service, repo };
}

const actor: AuditActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };

describe("Module 4 — Journal d'audit (consultation)", () => {
  it("liste toutes les entrées (limit par défaut 100) pour un admin d'org", async () => {
    const { service } = setup();
    const admin: AuditActor = { organisationId: "o1", isOrgAdmin: true, actorUserId: "u1" };
    const page = await service.query({}, admin);
    expect(page.total).toBe(3);
    expect(page.entries.length).toBe(3);
  });

  it("filtre par action", async () => {
    const { service } = setup();
    const page = await service.query({ action: "reservations.create" }, actor);
    expect(page.total).toBe(1);
    expect(page.entries[0]!.id).toBe("1");
  });

  it("filtre par entité (entityType + entityId)", async () => {
    const { service } = setup();
    const page = await service.query({ entityType: "Reservation", entityId: "r1" }, actor);
    expect(page.total).toBe(2);
  });

  it("isole : un utilisateur non-admin ne voit que SON hôtel", async () => {
    const { service } = setup();
    // actor.hotelId = h1, non-admin => force hotelId=h1
    const page = await service.query({}, actor);
    expect(page.total).toBe(2); // seulement h1
    expect(page.entries.every((e) => e.hotelId === "h1")).toBe(true);
  });

  it("un admin d'org voit toute l'organisation", async () => {
    const { service } = setup();
    const admin: AuditActor = { organisationId: "o1", isOrgAdmin: true, actorUserId: "u1" };
    const page = await service.query({}, admin);
    expect(page.total).toBe(3);
  });

  it("pagine correctement", async () => {
    const { service } = setup();
    const page = await service.query({ limit: 2, offset: 0 }, actor);
    expect(page.entries.length).toBe(2);
    expect(page.total).toBe(2); // isolé à h1 (2 entrées)
  });

  it("exporte en CSV avec en-tête et lignes", async () => {
    const { service } = setup();
    const csv = await service.exportCsv({}, actor);
    expect(csv).toContain("date,action,entityType,entityId");
    expect(csv.split("\n").length).toBe(3); // 1 en-tête + 2 lignes (h1)
    expect(csv).toContain("reservations.create");
  });

  it("toCsv échappe les guillemets dans le JSON", () => {
    const e = entries[0]!;
    const csv = toCsv([e]);
    expect(csv).toContain('""');
  });
});
