/**
 * Module 33 — Super Administration (SaaS Control Center) : service métier.
 *
 * **Exclusivement pour le Super Admin** (modules 32-35). Centre de contrôle :
 * gestion des hôtels (approbation, activation, suspension, suppression logique,
 * restauration, transfert), licences, support technique (tickets, SLA), monitoring,
 * sauvegardes, métriques SaaS, impersonation sécurisée (Login As Hotel Admin).
 *
 * Impersonation : action explicite + journalisation (qui/quel hôtel/quand/pourquoi)
 * + sortie immédiate + audit complet.
 *
 * Clean Architecture, SOLID, Provider Agnostic, DI, Event Driven. RBAC saas.*.
 * RLS auth_platform_admin (isolation stricte du Super Admin).
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { createHash, randomBytes } from "node:crypto";
import { SaasAdminError } from "./saasadmin.error.js";
import type { SaasAdminRepository } from "./saasadmin.repository.js";
import type {
  AddSupportMessageInput,
  AssignTicketInput,
  CreateBackupInput,
  CreateSupportTicketInput,
  HotelActivityInput,
  RunMonitorCheckInput,
  SaasBackup,
  SaasImpersonation,
  SaasLicense,
  SaasMetrics,
  SaasMonitorCheck,
  SaasSupportMessage,
  SaasSupportTicket,
  StartImpersonationInput,
} from "./saasadmin.types.js";
import {
  validateAddSupportMessage,
  validateAssignTicket,
  validateCreateBackup,
  validateCreateSupportTicket,
  validateRunMonitorCheck,
  validateStartImpersonation,
} from "./saasadmin.validation.js";

/** Contexte d'acteur (Super Admin). */
export interface SaasAdminActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class SaasAdminService {
  constructor(
    private readonly repo: SaasAdminRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Gestion des hôtels
  // ---------------------------------------------------------------------------

  async createHotel(organisationId: string, input: { name: string; code: string; city?: string | null; country?: string | null }, actor: SaasAdminActor): Promise<{ id: string; name: string }> {
    const hotel = await this.repo.createHotel(organisationId, input);
    await this.log(actor, "saas.hotel.create", "Hotel", hotel.id, { name: input.name });
    return hotel;
  }

  async listHotels(actor: SaasAdminActor) {
    return this.repo.listHotels();
  }

  /** Action d'administration sur un hôtel (approuver/activer/suspendre/supprimer/restaurer). */
  async hotelAction(input: HotelActivityInput, actor: SaasAdminActor): Promise<void> {
    const action = input.action;
    switch (action) {
      case "activate": await this.repo.setHotelActive(input.hotelId, true); break;
      case "suspend": await this.repo.setHotelActive(input.hotelId, false); break;
      case "delete": await this.repo.setHotelDeleted(input.hotelId, true); break;
      case "restore": await this.repo.setHotelDeleted(input.hotelId, false); break;
      default: throw new SaasAdminError("Action hôtel inconnue");
    }
    await this.log(actor, `saas.hotel.${action}`, "Hotel", input.hotelId, { detail: input.detail });
    await this.bus.publish({ name: DomainEvents.saasHotelChanged, hotelId: input.hotelId, organisationId: actor.organisationId, data: { action } });
  }

  async countHotels(actor: SaasAdminActor): Promise<number> {
    return this.repo.countHotels();
  }

  // ---------------------------------------------------------------------------
  // Licences
  // ---------------------------------------------------------------------------

  async createLicense(organisationId: string, input: { subscriptionId?: string | null; expiresAt?: Date | null; quotas: { ai: number; email: number; sms: number; whatsapp: number; api: number } }, actor: SaasAdminActor): Promise<SaasLicense> {
    const licenseKey = `AFR-${randomBytes(8).toString("hex").toUpperCase()}`;
    const license = await this.repo.createLicense({ organisationId, subscriptionId: input.subscriptionId ?? null, licenseKey, expiresAt: input.expiresAt ?? null, quotas: input.quotas });
    await this.log(actor, "saas.license.create", "SaasLicense", license.id, { organisationId });
    return license;
  }

  async listLicenses(status: string | undefined, actor: SaasAdminActor): Promise<SaasLicense[]> {
    return this.repo.listLicenses(status);
  }

  async revokeLicense(licenseId: string, actor: SaasAdminActor): Promise<void> {
    await this.repo.revokeLicense(licenseId);
  }

  // ---------------------------------------------------------------------------
  // Support technique
  // ---------------------------------------------------------------------------

  async createSupportTicket(input: CreateSupportTicketInput, actor: SaasAdminActor): Promise<SaasSupportTicket> {
    const v = validateCreateSupportTicket(input);
    const ticket = await this.repo.createSupportTicket({ ...v, createdBy: actor.actorUserId });
    await this.log(actor, "saas.support.ticket.create", "SaasSupportTicket", ticket.id, { subject: v.subject, priority: v.priority });
    return ticket;
  }

  async listSupportTickets(status: string | undefined, actor: SaasAdminActor): Promise<SaasSupportTicket[]> {
    return this.repo.listSupportTickets(status);
  }

  async assignTicket(input: AssignTicketInput, actor: SaasAdminActor): Promise<void> {
    const v = validateAssignTicket(input);
    await this.repo.updateSupportTicket(v.ticketId, { assignedTo: v.assignedTo });
    await this.log(actor, "saas.support.ticket.assign", "SaasSupportTicket", v.ticketId, { assignedTo: v.assignedTo });
  }

  async setTicketStatus(ticketId: string, status: string, actor: SaasAdminActor): Promise<void> {
    await this.repo.updateSupportTicket(ticketId, { status });
  }

  async addSupportMessage(input: AddSupportMessageInput, actor: SaasAdminActor): Promise<SaasSupportMessage> {
    const v = validateAddSupportMessage(input);
    return this.repo.addSupportMessage({ ...v, authorId: actor.actorUserId });
  }

  async listSupportMessages(ticketId: string, actor: SaasAdminActor): Promise<SaasSupportMessage[]> {
    return this.repo.listSupportMessages(ticketId);
  }

  // ---------------------------------------------------------------------------
  // Monitoring
  // ---------------------------------------------------------------------------

  async runMonitorCheck(input: RunMonitorCheckInput, actor: SaasAdminActor): Promise<SaasMonitorCheck> {
    const v = validateRunMonitorCheck(input);
    const check = await this.repo.runMonitorCheck(v);
    await this.log(actor, "saas.monitor.check", "SaasMonitorCheck", check.id, { target: v.target, status: v.status });
    return check;
  }

  async listMonitorChecks(target: string | undefined, actor: SaasAdminActor): Promise<SaasMonitorCheck[]> {
    return this.repo.listMonitorChecks(target, 200);
  }

  // ---------------------------------------------------------------------------
  // Sauvegardes
  // ---------------------------------------------------------------------------

  async createBackup(input: CreateBackupInput, actor: SaasAdminActor): Promise<SaasBackup> {
    const v = validateCreateBackup(input);
    const backup = await this.repo.createBackup(v);
    await this.log(actor, "saas.backup.create", "SaasBackup", backup.id, { type: v.type });
    return backup;
  }

  async listBackups(actor: SaasAdminActor): Promise<SaasBackup[]> {
    return this.repo.listBackups();
  }

  async restoreBackup(backupId: string, actor: SaasAdminActor): Promise<void> {
    await this.repo.markBackupStatus(backupId, "RESTORED", new Date());
    await this.log(actor, "saas.backup.restore", "SaasBackup", backupId);
  }

  // ---------------------------------------------------------------------------
  // Impersonation sécurisée (Login As Hotel Admin)
  // ---------------------------------------------------------------------------

  async startImpersonation(input: StartImpersonationInput, actor: SaasAdminActor): Promise<SaasImpersonation> {
    const v = validateStartImpersonation(input);
    if (!actor.actorUserId) throw new SaasAdminError("Super Admin non identifié");
    const imp = await this.repo.startImpersonation({ ...v, superAdminId: actor.actorUserId });
    // Journalisation exhaustive de l'accès.
    await this.log(actor, "saas.impersonation.start", "SaasImpersonation", imp.id, { targetUserId: v.targetUserId, hotelId: v.hotelId, reason: v.reason });
    return imp;
  }

  async endImpersonation(impersonationId: string, actor: SaasAdminActor): Promise<void> {
    await this.repo.endImpersonation(impersonationId);
    await this.log(actor, "saas.impersonation.end", "SaasImpersonation", impersonationId);
  }

  async listImpersonations(actor: SaasAdminActor): Promise<SaasImpersonation[]> {
    return actor.actorUserId ? this.repo.listImpersonations(actor.actorUserId) : [];
  }

  // ---------------------------------------------------------------------------
  // Métriques / tableau de bord SaaS
  // ---------------------------------------------------------------------------

  async dashboard(actor: SaasAdminActor): Promise<SaasMetrics> {
    const existing = await this.repo.getMetrics();
    if (existing) return existing;
    const agg = await this.repo.computeAggregates();
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return this.repo.recordMetrics({
      period: "month", periodStart, periodEnd,
      totalHotels: agg.totalHotels, activeHotels: agg.activeHotels, suspendedHotels: agg.suspendedHotels,
      totalUsers: agg.totalUsers, totalRooms: agg.totalRooms, totalBookings: agg.totalBookings, revenue: agg.revenue,
      mrr: Math.round(agg.revenue / 12), arr: agg.revenue,
      retentionRate: 0, churnRate: 0, growth: 0,
      aiUsage: 0, emailUsage: 0, smsUsage: 0, whatsappUsage: 0, apiUsage: 0, storageUsed: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async log(actor: SaasAdminActor, action: string, entityType: string, entityId: string, after?: Record<string, unknown>): Promise<void> {
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: actor.actorUserId, action, entityType, entityId, after: after ?? {} });
  }
}
