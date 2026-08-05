/**
 * Module 33 — Super Administration : adapter Prisma.
 */
import type {
  SaasAdminRepository,
  AddSupportMessageInput, CreateBackupInput, CreateSupportTicketInput, RunMonitorCheckInput,
  SaasBackup, SaasImpersonation, SaasLicense, SaasMetrics, SaasMonitorCheck, SaasSupportMessage,
  SaasSupportTicket, StartImpersonationInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaSaasAdminRepository implements SaasAdminRepository {
  async createHotel(org: string, input: { name: string; code: string; city?: string | null; country?: string | null }): Promise<{ id: string; name: string }> {
    const h = await prisma.hotel.create({ data: { organisationId: org, name: input.name, slug: input.code.toLowerCase().replace(/[^a-z0-9]+/g, "-"), code: input.code, city: input.city ?? null, country: input.country ?? null } });
    return { id: h.id, name: h.name };
  }
  async listHotels() {
    const rows = await prisma.hotel.findMany({ select: { id: true, name: true, code: true, isActive: true }, orderBy: { createdAt: "desc" } });
    return rows;
  }
  async getHotel(hotelId: string) {
    return prisma.hotel.findFirst({ where: { id: hotelId }, select: { id: true, name: true, code: true, isActive: true } });
  }
  async setHotelActive(hotelId: string, isActive: boolean): Promise<void> { await prisma.hotel.update({ where: { id: hotelId }, data: { isActive } }); }
  async setHotelDeleted(hotelId: string, deleted: boolean): Promise<void> { await prisma.hotel.update({ where: { id: hotelId }, data: { isActive: !deleted } }); }
  async countHotels(): Promise<number> { return prisma.hotel.count(); }

  async createLicense(input: { organisationId: string; subscriptionId?: string | null; licenseKey: string; expiresAt?: Date | null; quotas: { ai: number; email: number; sms: number; whatsapp: number; api: number } }): Promise<SaasLicense> {
    const l = await prisma.saasLicense.create({ data: { organisationId: input.organisationId, subscriptionId: input.subscriptionId ?? null, licenseKey: input.licenseKey, activatedAt: new Date(), expiresAt: input.expiresAt ?? null, quotaAi: input.quotas.ai, quotaEmail: input.quotas.email, quotaSms: input.quotas.sms, quotaWhatsapp: input.quotas.whatsapp, quotaApi: input.quotas.api } });
    return this.mapLic(l);
  }
  async listLicenses(status?: string): Promise<SaasLicense[]> {
    const rows = await prisma.saasLicense.findMany({ where: status ? { status } : {} });
    return rows.map((l) => this.mapLic(l));
  }
  async getLicenseByOrg(org: string): Promise<SaasLicense | null> { const l = await prisma.saasLicense.findFirst({ where: { organisationId: org } }); return l ? this.mapLic(l) : null; }
  async revokeLicense(licenseId: string): Promise<void> { await prisma.saasLicense.update({ where: { id: licenseId }, data: { status: "REVOKED" } }); }

  async createSupportTicket(input: CreateSupportTicketInput & { createdBy?: string }): Promise<SaasSupportTicket> {
    const t = await prisma.saasSupportTicket.create({ data: { organisationId: input.organisationId, hotelId: input.hotelId ?? null, subject: input.subject, description: input.description ?? null, priority: input.priority ?? "NORMAL", createdBy: input.createdBy ?? null } });
    return this.mapTkt(t);
  }
  async listSupportTickets(status?: string): Promise<SaasSupportTicket[]> {
    const rows = await prisma.saasSupportTicket.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" } });
    return rows.map((t) => this.mapTkt(t));
  }
  async getSupportTicket(ticketId: string): Promise<SaasSupportTicket | null> { const t = await prisma.saasSupportTicket.findUnique({ where: { id: ticketId } }); return t ? this.mapTkt(t) : null; }
  async updateSupportTicket(ticketId: string, data: Partial<{ status: string; priority: string; assignedTo: string; slaDueAt: Date }>): Promise<void> { await prisma.saasSupportTicket.update({ where: { id: ticketId }, data }); }
  async addSupportMessage(input: AddSupportMessageInput & { authorId?: string }): Promise<SaasSupportMessage> {
    const m = await prisma.saasSupportMessage.create({ data: { ticketId: input.ticketId, authorId: input.authorId ?? null, body: input.body, isInternal: input.isInternal ?? false } });
    return { id: m.id, ticketId: m.ticketId, authorId: m.authorId, body: m.body, isInternal: m.isInternal };
  }
  async listSupportMessages(ticketId: string): Promise<SaasSupportMessage[]> {
    const rows = await prisma.saasSupportMessage.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" } });
    return rows.map((m) => ({ id: m.id, ticketId: m.ticketId, authorId: m.authorId, body: m.body, isInternal: m.isInternal }));
  }

  async runMonitorCheck(input: RunMonitorCheckInput): Promise<SaasMonitorCheck> {
    const c = await prisma.saasMonitorCheck.create({ data: { target: input.target, name: input.name, status: input.status ?? "UP", latencyMs: input.latencyMs ?? null, detail: input.detail ?? null } });
    return this.mapChk(c);
  }
  async listMonitorChecks(target?: string, limit = 200): Promise<SaasMonitorCheck[]> {
    const rows = await prisma.saasMonitorCheck.findMany({ where: target ? { target } : {}, orderBy: { checkedAt: "desc" }, take: limit });
    return rows.map((c) => this.mapChk(c));
  }

  async createBackup(input: CreateBackupInput): Promise<SaasBackup> {
    const b = await prisma.saasBackup.create({ data: { name: input.name, type: input.type ?? "AUTO" } });
    return this.mapBak(b);
  }
  async listBackups(): Promise<SaasBackup[]> {
    const rows = await prisma.saasBackup.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((b) => this.mapBak(b));
  }
  async markBackupStatus(backupId: string, status: string, completedAt?: Date): Promise<void> { await prisma.saasBackup.update({ where: { id: backupId }, data: { status, completedAt: completedAt ?? null } }); }

  async startImpersonation(input: StartImpersonationInput & { superAdminId: string }): Promise<SaasImpersonation> {
    const i = await prisma.saasImpersonation.create({ data: { superAdminId: input.superAdminId, targetUserId: input.targetUserId, hotelId: input.hotelId, reason: input.reason ?? null } });
    return this.mapImp(i);
  }
  async endImpersonation(impId: string): Promise<void> { await prisma.saasImpersonation.update({ where: { id: impId }, data: { endedAt: new Date() } }); }
  async listImpersonations(superAdminId: string): Promise<SaasImpersonation[]> {
    const rows = await prisma.saasImpersonation.findMany({ where: { superAdminId }, orderBy: { startedAt: "desc" } });
    return rows.map((i) => this.mapImp(i));
  }

  async getMetrics(): Promise<SaasMetrics | null> { const m = await prisma.saasMetrics.findFirst({ orderBy: { createdAt: "desc" } }); return m ? this.mapMet(m) : null; }
  async recordMetrics(m: Omit<SaasMetrics, "id">): Promise<SaasMetrics> {
    const r = await prisma.saasMetrics.create({ data: { period: m.period, periodStart: m.periodStart, periodEnd: m.periodEnd, totalHotels: m.totalHotels, activeHotels: m.activeHotels, suspendedHotels: m.suspendedHotels, totalUsers: m.totalUsers, totalRooms: m.totalRooms, totalBookings: m.totalBookings, revenue: m.revenue, mrr: m.mrr, arr: m.arr, retentionRate: m.retentionRate, churnRate: m.churnRate, growth: m.growth, aiUsage: m.aiUsage, emailUsage: m.emailUsage, smsUsage: m.smsUsage, whatsappUsage: m.whatsappUsage, apiUsage: m.apiUsage, storageUsed: m.storageUsed } });
    return this.mapMet(r);
  }
  async computeAggregates() {
    const [totalHotels, activeHotels, suspendedHotels, totalUsers, totalRooms, totalBookings, revenue] = await Promise.all([
      prisma.hotel.count(),
      prisma.hotel.count({ where: { isActive: true } }),
      prisma.hotel.count({ where: { isActive: false } }),
      prisma.user.count(),
      prisma.room.count(),
      prisma.reservation.count(),
      prisma.reservation.aggregate({ _sum: { amount: true } }),
    ]);
    return { totalHotels, activeHotels, suspendedHotels, totalUsers, totalRooms, totalBookings, revenue: revenue._sum.amount ?? 0 };
  }

  private mapLic(l: { id: string; organisationId: string; subscriptionId: string | null; licenseKey: string; status: string; activatedAt: Date | null; expiresAt: Date | null; renewedAt: Date | null; quotaAi: number; quotaEmail: number; quotaSms: number; quotaWhatsapp: number; quotaApi: number; usedAi: number; usedEmail: number; usedSms: number; usedWhatsapp: number; usedApi: number }): SaasLicense {
    return { id: l.id, organisationId: l.organisationId, subscriptionId: l.subscriptionId, licenseKey: l.licenseKey, status: l.status, activatedAt: l.activatedAt, expiresAt: l.expiresAt, renewedAt: l.renewedAt, quotaAi: l.quotaAi, quotaEmail: l.quotaEmail, quotaSms: l.quotaSms, quotaWhatsapp: l.quotaWhatsapp, quotaApi: l.quotaApi, usedAi: l.usedAi, usedEmail: l.usedEmail, usedSms: l.usedSms, usedWhatsapp: l.usedWhatsapp, usedApi: l.usedApi };
  }
  private mapTkt(t: { id: string; organisationId: string; hotelId: string | null; subject: string; description: string | null; status: string; priority: string; slaDueAt: Date | null; assignedTo: string | null; createdBy: string | null }): SaasSupportTicket {
    return { id: t.id, organisationId: t.organisationId, hotelId: t.hotelId, subject: t.subject, description: t.description, status: t.status, priority: t.priority, slaDueAt: t.slaDueAt, assignedTo: t.assignedTo, createdBy: t.createdBy };
  }
  private mapChk(c: { id: string; target: string; name: string; status: string; latencyMs: number | null; detail: string | null; checkedAt: Date }): SaasMonitorCheck {
    return { id: c.id, target: c.target, name: c.name, status: c.status, latencyMs: c.latencyMs, detail: c.detail, checkedAt: c.checkedAt };
  }
  private mapBak(b: { id: string; name: string; type: string; status: string; sizeBytes: bigint | null; url: string | null; scheduledAt: Date | null; completedAt: Date | null }): SaasBackup {
    return { id: b.id, name: b.name, type: b.type, status: b.status, sizeBytes: b.sizeBytes, url: b.url, scheduledAt: b.scheduledAt, completedAt: b.completedAt };
  }
  private mapImp(i: { id: string; superAdminId: string; targetUserId: string; hotelId: string; reason: string | null; startedAt: Date; endedAt: Date | null }): SaasImpersonation {
    return { id: i.id, superAdminId: i.superAdminId, targetUserId: i.targetUserId, hotelId: i.hotelId, reason: i.reason, startedAt: i.startedAt, endedAt: i.endedAt };
  }
  private mapMet(m: { id: string; period: string; periodStart: Date; periodEnd: Date; totalHotels: number; activeHotels: number; suspendedHotels: number; totalUsers: number; totalRooms: number; totalBookings: number; revenue: number; mrr: number; arr: number; retentionRate: import("@prisma/client").Prisma.Decimal; churnRate: import("@prisma/client").Prisma.Decimal; growth: import("@prisma/client").Prisma.Decimal; aiUsage: number; emailUsage: number; smsUsage: number; whatsappUsage: number; apiUsage: number; storageUsed: number }): SaasMetrics {
    return { id: m.id, period: m.period, periodStart: m.periodStart, periodEnd: m.periodEnd, totalHotels: m.totalHotels, activeHotels: m.activeHotels, suspendedHotels: m.suspendedHotels, totalUsers: m.totalUsers, totalRooms: m.totalRooms, totalBookings: m.totalBookings, revenue: m.revenue, mrr: m.mrr, arr: m.arr, retentionRate: m.retentionRate.toNumber(), churnRate: m.churnRate.toNumber(), growth: m.growth.toNumber(), aiUsage: m.aiUsage, emailUsage: m.emailUsage, smsUsage: m.smsUsage, whatsappUsage: m.whatsappUsage, apiUsage: m.apiUsage, storageUsed: m.storageUsed };
  }
}
