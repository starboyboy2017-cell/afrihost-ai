import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { CertificationService, type CertificationActor } from "./certification.service.js";
import type { CertificationRepository } from "./certification.repository.js";
import type { PlatformStats } from "./certification.types.js";

class MemoryRepo implements CertificationRepository {
  stats: PlatformStats = { hotels: 2, users: 10, rooms: 14, reservations: 5, guests: 3, modules: 37, migrations: 31, tables: 100 };
  async getPlatformStats(): Promise<PlatformStats> { return this.stats; }
  async countTables(): Promise<number> { return this.stats.tables; }
  async hasAppliedMigrations(): Promise<boolean> { return true; }
  async countSuperAdmins(): Promise<number> { return 1; }
  async countInactiveUsers(): Promise<number> { return 0; }
  async organisationsWithHotels(): Promise<number> { return 1; }
}

const actor: CertificationActor = { organisationId: "super", hotelId: "saas", actorUserId: "sa" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new CertificationService(repo, audit, bus);
  return { repo, svc };
}

describe("certification.service", () => {
  beforeEach(() => {});

  it("produit un audit global complet", async () => {
    const { svc } = build();
    const report = await svc.auditGlobal(actor);
    expect(report.totalChecks).toBeGreaterThan(10);
    expect(report.failed).toBe(0);
    expect(report.byCategory.database).toBeDefined();
    expect(report.byCategory.security).toBeDefined();
  });

  it("simule le parcours SaaS complet d'un hôtel", async () => {
    const { svc } = build();
    const journey = await svc.simulateSaasJourney(actor);
    expect(journey.complete).toBe(true);
    expect(journey.steps.length).toBeGreaterThan(10);
  });

  it("déclare la plateforme Production Ready si tout est conforme", async () => {
    const { svc } = build();
    const cert = await svc.certify(actor);
    expect(cert.certified).toBe(true);
    expect(cert.productionReady).toBe(true);
    expect(cert.modules.length).toBeGreaterThan(30);
    expect(cert.compliance).toContain("RGPD");
    expect(cert.securityLevel).toContain("Enterprise");
  });

  it("fournit les statistiques de plateforme", async () => {
    const { svc } = build();
    const stats = await svc.platformStats(actor);
    expect(stats.hotels).toBe(2);
    expect(stats.migrations).toBe(31);
  });
});
