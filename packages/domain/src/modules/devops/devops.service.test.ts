import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { DevopsService, type DevopsActor } from "./devops.service.js";
import type { DevopsRepository } from "./devops.repository.js";
import type {
  HealthCheck, IntegrityCheck, ReportSecurityIncidentInput, RotateSecretInput, RunHealthCheckInput,
  RunIntegrityCheckInput, SecretRotation, SecurityIncident,
} from "./devops.types.js";

let seq = 0;

class MemoryRepo implements DevopsRepository {
  checks: HealthCheck[] = [];
  incidents: SecurityIncident[] = [];
  rotations: SecretRotation[] = [];
  integrity: IntegrityCheck[] = [];

  async runHealthCheck(input: RunHealthCheckInput): Promise<HealthCheck> {
    const c: HealthCheck = { id: `hc-${++seq}`, component: input.component, status: input.status ?? "UP", latencyMs: input.latencyMs ?? null, region: input.region ?? null, detail: input.detail ?? null, checkedAt: new Date() };
    this.checks.push(c); return c;
  }
  async listHealthChecks(component?: string, limit = 200): Promise<HealthCheck[]> { return this.checks.filter((c) => (component ? c.component === component : true)).slice(0, limit); }
  async latestHealthChecks(): Promise<HealthCheck[]> { return this.checks.slice(-50); }

  async reportIncident(input: ReportSecurityIncidentInput): Promise<SecurityIncident> {
    const i: SecurityIncident = { id: `inc-${++seq}`, type: input.type, severity: input.severity ?? "LOW", source: input.source ?? null, detail: input.detail ?? null, status: "OPEN", ip: input.ip ?? null, resolvedAt: null };
    this.incidents.push(i); return i;
  }
  async listIncidents(status?: string, limit = 200): Promise<SecurityIncident[]> { return this.incidents.filter((i) => (status ? i.status === status : true)).slice(0, limit); }
  async resolveIncident(incidentId: string): Promise<void> { const i = this.incidents.find((x) => x.id === incidentId)!; i.status = "RESOLVED"; i.resolvedAt = new Date(); }

  async rotateSecret(input: RotateSecretInput & { triggeredBy?: string }): Promise<SecretRotation> {
    const r: SecretRotation = { id: `rot-${++seq}`, secretKey: input.secretKey, provider: input.provider ?? null, rotatedAt: new Date(), triggeredBy: input.triggeredBy ?? null, reason: input.reason ?? null };
    this.rotations.push(r); return r;
  }
  async listSecretRotations(limit = 200): Promise<SecretRotation[]> { return this.rotations.slice(0, limit); }

  async runIntegrityCheck(input: RunIntegrityCheckInput): Promise<IntegrityCheck> {
    const c: IntegrityCheck = { id: `ic-${++seq}`, backupId: input.backupId ?? null, target: input.target, status: "PASSED", checksum: input.checksum ?? null, detail: null, checkedAt: new Date() };
    this.integrity.push(c); return c;
  }
  async listIntegrityChecks(limit = 200): Promise<IntegrityCheck[]> { return this.integrity.slice(0, limit); }

  async countHotels(): Promise<number> { return 2; }
  async countUsers(): Promise<number> { return 10; }
  async hasMigrationsApplied(): Promise<boolean> { return true; }
}

const actor: DevopsActor = { organisationId: "super", hotelId: "saas", actorUserId: "sa" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new DevopsService(repo, audit, bus);
  return { repo, svc, bus };
}

describe("devops.service", () => {
  beforeEach(() => { seq = 0; });

  it("exécute un health check", async () => {
    const { svc } = build();
    const c = await svc.runHealthCheck({ component: "supabase", status: "UP", latencyMs: 42 }, actor);
    expect(c.status).toBe("UP");
  });

  it("produit un health dashboard agrégé", async () => {
    const { svc } = build();
    await svc.runHealthCheck({ component: "app", status: "UP" }, actor);
    await svc.runHealthCheck({ component: "supabase", status: "UP" }, actor);
    await svc.runHealthCheck({ component: "ota", status: "DEGRADED" }, actor);
    const h = await svc.healthDashboard(actor);
    expect(h.overall).toBe("DEGRADED");
    expect(h.components.length).toBe(3);
    expect(h.uptime).toBeGreaterThan(0);
  });

  it("signale un incident de sécurité", async () => {
    const { repo, svc } = build();
    await svc.reportIncident({ type: "brute_force", severity: "HIGH", ip: "1.2.3.4" }, actor);
    expect(repo.incidents.length).toBe(1);
    const incidents = await svc.listIncidents("OPEN", actor);
    expect(incidents.length).toBe(1);
  });

  it("résout un incident", async () => {
    const { repo, svc } = build();
    const inc = await svc.reportIncident({ type: "xss", severity: "MEDIUM" }, actor);
    await svc.resolveIncident(inc.id, actor);
    expect(repo.incidents.find((i) => i.id === inc.id)!.status).toBe("RESOLVED");
  });

  it("effectue une rotation de secret", async () => {
    const { repo, svc } = build();
    const r = await svc.rotateSecret({ secretKey: "STRIPE_KEY", provider: "stripe", reason: "rotation trimestrielle" }, actor);
    expect(r.secretKey).toBe("STRIPE_KEY");
    expect(repo.rotations.length).toBe(1);
  });

  it("vérifie l'intégrité d'une sauvegarde", async () => {
    const { repo, svc } = build();
    const c = await svc.runIntegrityCheck({ backupId: "bak-1", target: "db", checksum: "abc123" }, actor);
    expect(c.status).toBe("PASSED");
    expect(repo.integrity.length).toBe(1);
  });

  it("produit le rapport de préparation à la production", async () => {
    const { svc } = build();
    await svc.runHealthCheck({ component: "app", status: "UP" }, actor);
    const report = await svc.productionReadiness(actor);
    expect(report.ready).toBe(true);
    expect(report.summary.failed).toBe(0);
    expect(report.checks.length).toBeGreaterThan(5);
  });
});
