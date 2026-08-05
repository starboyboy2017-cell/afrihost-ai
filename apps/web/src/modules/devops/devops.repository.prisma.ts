/**
 * Module 34 — DevOps & Sécurité Entreprise : adapter Prisma.
 */
import type {
  DevopsRepository,
  HealthCheck, IntegrityCheck, ReportSecurityIncidentInput, RotateSecretInput, RunHealthCheckInput,
  RunIntegrityCheckInput, SecretRotation, SecurityIncident,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaDevopsRepository implements DevopsRepository {
  async runHealthCheck(input: RunHealthCheckInput): Promise<HealthCheck> {
    const c = await prisma.healthCheck.create({ data: { component: input.component, status: input.status ?? "UP", latencyMs: input.latencyMs ?? null, region: input.region ?? null, detail: input.detail ?? null } });
    return { id: c.id, component: c.component, status: c.status, latencyMs: c.latencyMs, region: c.region, detail: c.detail, checkedAt: c.checkedAt };
  }
  async listHealthChecks(component?: string, limit = 200): Promise<HealthCheck[]> {
    const rows = await prisma.healthCheck.findMany({ where: component ? { component } : {}, orderBy: { checkedAt: "desc" }, take: limit });
    return rows.map((c) => ({ id: c.id, component: c.component, status: c.status, latencyMs: c.latencyMs, region: c.region, detail: c.detail, checkedAt: c.checkedAt }));
  }
  async latestHealthChecks(): Promise<HealthCheck[]> {
    const rows = await prisma.healthCheck.findMany({ orderBy: { checkedAt: "desc" }, take: 50 });
    return rows.map((c) => ({ id: c.id, component: c.component, status: c.status, latencyMs: c.latencyMs, region: c.region, detail: c.detail, checkedAt: c.checkedAt }));
  }

  async reportIncident(input: ReportSecurityIncidentInput): Promise<SecurityIncident> {
    const i = await prisma.securityIncident.create({ data: { type: input.type, severity: input.severity ?? "LOW", source: input.source ?? null, detail: input.detail ?? null, ip: input.ip ?? null } });
    return { id: i.id, type: i.type, severity: i.severity, source: i.source, detail: i.detail, status: i.status, ip: i.ip, resolvedAt: i.resolvedAt };
  }
  async listIncidents(status?: string, limit = 200): Promise<SecurityIncident[]> {
    const rows = await prisma.securityIncident.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((i) => ({ id: i.id, type: i.type, severity: i.severity, source: i.source, detail: i.detail, status: i.status, ip: i.ip, resolvedAt: i.resolvedAt }));
  }
  async resolveIncident(incidentId: string): Promise<void> {
    await prisma.securityIncident.update({ where: { id: incidentId }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  }

  async rotateSecret(input: RotateSecretInput & { triggeredBy?: string }): Promise<SecretRotation> {
    const r = await prisma.secretRotation.create({ data: { secretKey: input.secretKey, provider: input.provider ?? null, triggeredBy: input.triggeredBy ?? null, reason: input.reason ?? null } });
    return { id: r.id, secretKey: r.secretKey, provider: r.provider, rotatedAt: r.rotatedAt, triggeredBy: r.triggeredBy, reason: r.reason };
  }
  async listSecretRotations(limit = 200): Promise<SecretRotation[]> {
    const rows = await prisma.secretRotation.findMany({ orderBy: { rotatedAt: "desc" }, take: limit });
    return rows.map((r) => ({ id: r.id, secretKey: r.secretKey, provider: r.provider, rotatedAt: r.rotatedAt, triggeredBy: r.triggeredBy, reason: r.reason }));
  }

  async runIntegrityCheck(input: RunIntegrityCheckInput): Promise<IntegrityCheck> {
    const c = await prisma.integrityCheck.create({ data: { backupId: input.backupId ?? null, target: input.target, checksum: input.checksum ?? null } });
    return { id: c.id, backupId: c.backupId, target: c.target, status: c.status, checksum: c.checksum, detail: c.detail, checkedAt: c.checkedAt };
  }
  async listIntegrityChecks(limit = 200): Promise<IntegrityCheck[]> {
    const rows = await prisma.integrityCheck.findMany({ orderBy: { checkedAt: "desc" }, take: limit });
    return rows.map((c) => ({ id: c.id, backupId: c.backupId, target: c.target, status: c.status, checksum: c.checksum, detail: c.detail, checkedAt: c.checkedAt }));
  }

  async countHotels(): Promise<number> { return prisma.hotel.count(); }
  async countUsers(): Promise<number> { return prisma.user.count(); }
  async hasMigrationsApplied(): Promise<boolean> { return true; }
}
