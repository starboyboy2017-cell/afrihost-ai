import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { SaasAdminService, type SaasAdminActor } from "./saasadmin.service.js";
import { SaasAdminError } from "./saasadmin.error.js";
import type { SaasAdminRepository } from "./saasadmin.repository.js";
import type {
  AddSupportMessageInput, CreateBackupInput, CreateSupportTicketInput, RunMonitorCheckInput,
  SaasBackup, SaasImpersonation, SaasLicense, SaasMetrics, SaasMonitorCheck, SaasSupportMessage,
  SaasSupportTicket, StartImpersonationInput,
} from "./saasadmin.types.js";

let seq = 0;

class MemoryRepo implements SaasAdminRepository {
  hotels: Array<{ id: string; name: string; code: string; isActive: boolean; deletedAt: Date | null }> = [];
  licenses: SaasLicense[] = [];
  tickets: SaasSupportTicket[] = [];
  msgs: SaasSupportMessage[] = [];
  checks: SaasMonitorCheck[] = [];
  backups: SaasBackup[] = [];
  imps: SaasImpersonation[] = [];
  metrics: SaasMetrics | null = null;

  async createHotel(org: string, input: { name: string; code: string }): Promise<{ id: string; name: string }> {
    const h = { id: `hot-${++seq}`, name: input.name, code: input.code, isActive: false, deletedAt: null };
    this.hotels.push(h); return { id: h.id, name: h.name };
  }
  async listHotels() { return this.hotels; }
  async getHotel(hotelId: string) { return this.hotels.find((h) => h.id === hotelId) ?? null; }
  async setHotelActive(hotelId: string, isActive: boolean): Promise<void> { const h = this.hotels.find((x) => x.id === hotelId)!; h.isActive = isActive; }
  async setHotelDeleted(hotelId: string, deleted: boolean): Promise<void> { const h = this.hotels.find((x) => x.id === hotelId)!; h.deletedAt = deleted ? new Date() : null; }
  async countHotels(): Promise<number> { return this.hotels.length; }

  async createLicense(input: { organisationId: string; subscriptionId?: string | null; licenseKey: string; expiresAt?: Date | null; quotas: { ai: number; email: number; sms: number; whatsapp: number; api: number } }): Promise<SaasLicense> {
    const l: SaasLicense = { id: `lic-${++seq}`, organisationId: input.organisationId, subscriptionId: input.subscriptionId ?? null, licenseKey: input.licenseKey, status: "ACTIVE", activatedAt: new Date(), expiresAt: input.expiresAt ?? null, renewedAt: null, quotaAi: input.quotas.ai, quotaEmail: input.quotas.email, quotaSms: input.quotas.sms, quotaWhatsapp: input.quotas.whatsapp, quotaApi: input.quotas.api, usedAi: 0, usedEmail: 0, usedSms: 0, usedWhatsapp: 0, usedApi: 0 };
    this.licenses.push(l); return l;
  }
  async listLicenses(status?: string): Promise<SaasLicense[]> { return this.licenses.filter((l) => (status ? l.status === status : true)); }
  async getLicenseByOrg(org: string): Promise<SaasLicense | null> { return this.licenses.find((l) => l.organisationId === org) ?? null; }
  async revokeLicense(licenseId: string): Promise<void> { const l = this.licenses.find((x) => x.id === licenseId)!; l.status = "REVOKED"; }

  async createSupportTicket(input: CreateSupportTicketInput & { createdBy?: string }): Promise<SaasSupportTicket> {
    const t: SaasSupportTicket = { id: `tkt-${++seq}`, organisationId: input.organisationId, hotelId: input.hotelId ?? null, subject: input.subject, description: input.description ?? null, status: "OPEN", priority: input.priority ?? "NORMAL", slaDueAt: null, assignedTo: null, createdBy: input.createdBy ?? null };
    this.tickets.push(t); return t;
  }
  async listSupportTickets(status?: string): Promise<SaasSupportTicket[]> { return this.tickets.filter((t) => (status ? t.status === status : true)); }
  async getSupportTicket(ticketId: string): Promise<SaasSupportTicket | null> { return this.tickets.find((t) => t.id === ticketId) ?? null; }
  async updateSupportTicket(ticketId: string, data: Partial<{ status: string; priority: string; assignedTo: string; slaDueAt: Date }>): Promise<void> { Object.assign(this.tickets.find((x) => x.id === ticketId)!, data); }
  async addSupportMessage(input: AddSupportMessageInput & { authorId?: string }): Promise<SaasSupportMessage> {
    const m: SaasSupportMessage = { id: `msg-${++seq}`, ticketId: input.ticketId, authorId: input.authorId ?? null, body: input.body, isInternal: input.isInternal ?? false };
    this.msgs.push(m); return m;
  }
  async listSupportMessages(ticketId: string): Promise<SaasSupportMessage[]> { return this.msgs.filter((m) => m.ticketId === ticketId); }

  async runMonitorCheck(input: RunMonitorCheckInput): Promise<SaasMonitorCheck> {
    const c: SaasMonitorCheck = { id: `chk-${++seq}`, target: input.target, name: input.name, status: input.status ?? "UP", latencyMs: input.latencyMs ?? null, detail: input.detail ?? null, checkedAt: new Date() };
    this.checks.push(c); return c;
  }
  async listMonitorChecks(target?: string, limit = 200): Promise<SaasMonitorCheck[]> { return this.checks.filter((c) => (target ? c.target === target : true)).slice(0, limit); }

  async createBackup(input: CreateBackupInput): Promise<SaasBackup> {
    const b: SaasBackup = { id: `bak-${++seq}`, name: input.name, type: input.type ?? "AUTO", status: "PENDING", sizeBytes: null, url: null, scheduledAt: null, completedAt: null };
    this.backups.push(b); return b;
  }
  async listBackups(): Promise<SaasBackup[]> { return this.backups; }
  async markBackupStatus(backupId: string, status: string, completedAt?: Date): Promise<void> { const b = this.backups.find((x) => x.id === backupId)!; b.status = status; b.completedAt = completedAt ?? null; }

  async startImpersonation(input: StartImpersonationInput & { superAdminId: string }): Promise<SaasImpersonation> {
    const i: SaasImpersonation = { id: `imp-${++seq}`, superAdminId: input.superAdminId, targetUserId: input.targetUserId, hotelId: input.hotelId, reason: input.reason ?? null, startedAt: new Date(), endedAt: null };
    this.imps.push(i); return i;
  }
  async endImpersonation(impId: string): Promise<void> { const i = this.imps.find((x) => x.id === impId)!; i.endedAt = new Date(); }
  async listImpersonations(superAdminId: string): Promise<SaasImpersonation[]> { return this.imps.filter((i) => i.superAdminId === superAdminId); }

  async getMetrics(): Promise<SaasMetrics | null> { return this.metrics; }
  async recordMetrics(m: Omit<SaasMetrics, "id">): Promise<SaasMetrics> { this.metrics = { id: `met-${++seq}`, ...m }; return this.metrics; }
  async computeAggregates() { return { totalHotels: this.hotels.length, activeHotels: this.hotels.filter((h) => h.isActive).length, suspendedHotels: this.hotels.filter((h) => !h.isActive).length, totalUsers: 0, totalRooms: 0, totalBookings: 0, revenue: 100000 }; }
}

const actor: SaasAdminActor = { organisationId: "super", hotelId: "saas", actorUserId: "sa" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new SaasAdminService(repo, audit, bus);
  return { repo, svc, bus };
}

describe("saasadmin.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée un hôtel et le suspend/active", async () => {
    const { repo, svc } = build();
    const h = await svc.createHotel("org1", { name: "Hôtel Test", code: "TEST-1" }, actor);
    await svc.hotelAction({ hotelId: h.id, action: "activate" }, actor);
    expect(repo.hotels.find((x) => x.id === h.id)!.isActive).toBe(true);
    await svc.hotelAction({ hotelId: h.id, action: "suspend" }, actor);
    expect(repo.hotels.find((x) => x.id === h.id)!.isActive).toBe(false);
  });

  it("supprime et restaure un hôtel (logique)", async () => {
    const { repo, svc } = build();
    const h = await svc.createHotel("org1", { name: "H", code: "H1" }, actor);
    await svc.hotelAction({ hotelId: h.id, action: "delete" }, actor);
    expect(repo.hotels.find((x) => x.id === h.id)!.deletedAt).toBeTruthy();
    await svc.hotelAction({ hotelId: h.id, action: "restore" }, actor);
    expect(repo.hotels.find((x) => x.id === h.id)!.deletedAt).toBeNull();
  });

  it("crée une licence avec quotas", async () => {
    const { svc } = build();
    const l = await svc.createLicense("org1", { quotas: { ai: 1000, email: 500, sms: 200, whatsapp: 200, api: 500 } }, actor);
    expect(l.licenseKey).toMatch(/^AFR-/);
    expect(l.quotaAi).toBe(1000);
  });

  it("crée un ticket de support et l'assigne", async () => {
    const { repo, svc } = build();
    const t = await svc.createSupportTicket({ organisationId: "org1", subject: "Problème de connexion" }, actor);
    await svc.assignTicket({ ticketId: t.id, assignedTo: "agent1" }, actor);
    expect(repo.tickets.find((x) => x.id === t.id)!.assignedTo).toBe("agent1");
  });

  it("ajoute un message interne au ticket", async () => {
    const { svc } = build();
    const t = await svc.createSupportTicket({ organisationId: "org1", subject: "Bug" }, actor);
    const m = await svc.addSupportMessage({ ticketId: t.id, body: "à vérifier", isInternal: true }, actor);
    expect(m.isInternal).toBe(true);
  });

  it("enregistre un check de monitoring", async () => {
    const { repo, svc } = build();
    await svc.runMonitorCheck({ target: "supabase", name: "DB", status: "UP", latencyMs: 45 }, actor);
    expect(repo.checks.length).toBe(1);
  });

  it("crée une sauvegarde et la restaure", async () => {
    const { repo, svc } = build();
    const b = await svc.createBackup({ name: "backup-1", type: "MANUAL" }, actor);
    await svc.restoreBackup(b.id, actor);
    expect(repo.backups.find((x) => x.id === b.id)!.status).toBe("RESTORED");
  });

  it("impersonation sécurisée : démarre puis se termine", async () => {
    const { repo, svc } = build();
    const imp = await svc.startImpersonation({ targetUserId: "hotel-admin-1", hotelId: "hot-1", reason: "Diagnostic facture" }, actor);
    expect(imp.reason).toBe("Diagnostic facture");
    await svc.endImpersonation(imp.id, actor);
    expect(repo.imps.find((x) => x.id === imp.id)!.endedAt).toBeTruthy();
    const list = await svc.listImpersonations(actor);
    expect(list.length).toBe(1);
  });

  it("fournit le tableau de bord SaaS (métriques)", async () => {
    const { svc } = build();
    await svc.createHotel("org1", { name: "H1", code: "H1" }, actor);
    await svc.hotelAction({ hotelId: (await svc.listHotels(actor))[0]!.id, action: "activate" }, actor);
    const dash = await svc.dashboard(actor);
    expect(dash.totalHotels).toBe(1);
    expect(dash.activeHotels).toBe(1);
    expect(dash.mrr).toBeGreaterThan(0);
  });
});
