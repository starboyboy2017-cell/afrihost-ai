/**
 * Module 28 — Reporting & Business Intelligence : service métier.
 *
 * Tableaux de bord dynamiques (personnalisables par rôle), rapports
 * (opérationnels/financiers/commerciaux/analytiques/personnalisés), KPI
 * (ADR, RevPAR, TRevPAR, occupation, revenus, annulations, no-show, durée
 * moyenne), statistiques CRM/Fidélité/POS/Housekeeping/Maintenance/Stocks/
 * Transport/Blanchisserie/Channel, filtres avancés, exports PDF/Excel/CSV,
 * planification par email, tableaux de bord multi-hôtels.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC bi.*. Audit.
 */
import { type AuditTrail, type EventBus } from "@afrihost/core";
import { BiError } from "./bi.error.js";
import { computeKpis, toTimeSeries } from "./bi.kpi-engine.js";
import type { BiRepository } from "./bi.repository.js";
import type {
  BiDashboard,
  BiReport,
  BiSchedule,
  CreateDashboardInput,
  CreateReportInput,
  CreateScheduleInput,
  HotelKpis,
  KpiFilter,
  ReportResult,
  TimeSeriesPoint,
} from "./bi.types.js";
import {
  validateCreateDashboard,
  validateCreateReport,
  validateCreateSchedule,
} from "./bi.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface BiActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class BiService {
  constructor(
    private readonly repo: BiRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Tableaux de bord
  // ---------------------------------------------------------------------------

  async createDashboard(hotelId: string, input: CreateDashboardInput, actor: BiActor): Promise<BiDashboard> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateDashboard(input);
    const dash = await this.repo.createDashboard(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "bi.dashboard.create", entityType: "BiDashboard", entityId: dash.id, after: { name: v.name, role: v.role } });
    return dash;
  }

  async listDashboards(hotelId: string, role: string | undefined, actor: BiActor): Promise<BiDashboard[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listDashboards(hotelId, role);
  }

  // ---------------------------------------------------------------------------
  // Rapports
  // ---------------------------------------------------------------------------

  async createReport(hotelId: string, input: CreateReportInput, actor: BiActor): Promise<BiReport> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateReport(input);
    const report = await this.repo.createReport(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "bi.report.create", entityType: "BiReport", entityId: report.id, after: { name: v.name, type: v.type, category: v.category } });
    return report;
  }

  async listReports(hotelId: string, category: string | undefined, actor: BiActor): Promise<BiReport[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listReports(hotelId, category);
  }

  // ---------------------------------------------------------------------------
  // KPI & rapports générés
  // ---------------------------------------------------------------------------

  /** Calcule les KPI d'un hôtel (ou agrégés multi-hôtels). */
  async kpis(hotelId: string, filter: KpiFilter, actor: BiActor): Promise<HotelKpis> {
    this.assertHotel(hotelId, actor);
    const from = new Date(filter.from ?? new Date(Date.now() - 30 * 86400000));
    const to = new Date(filter.to ?? new Date());
    const data = await this.repo.getKpiData(hotelId, from, to);
    return computeKpis(hotelId, from, to, data);
  }

  /** KPI agrégés sur plusieurs hôtels (multi-hôtels). */
  async kpisMultiHotel(hotelIds: string[], filter: KpiFilter, actor: BiActor): Promise<HotelKpis[]> {
    // Autorise uniquement les hôtels de l'organisation de l'acteur (isolation).
    const results: HotelKpis[] = [];
    for (const hid of hotelIds) {
      try {
        this.assertHotel(hid, actor);
        results.push(await this.kpis(hid, filter, actor));
      } catch {
        // hôtel hors accès → ignoré
      }
    }
    return results;
  }

  /** Série temporelle pour graphique (occupation / revenus). */
  async timeSeries(hotelId: string, metric: string, filter: KpiFilter, actor: BiActor): Promise<TimeSeriesPoint[]> {
    this.assertHotel(hotelId, actor);
    const from = new Date(filter.from ?? new Date(Date.now() - 30 * 86400000));
    const to = new Date(filter.to ?? new Date());
    const points = await this.repo.getTimeSeries(hotelId, from, to, metric);
    return toTimeSeries(points, (d) => d.toISOString().slice(0, 10));
  }

  /** Statistiques d'un autre module (CRM, fidélité, POS, housekeeping...). */
  async moduleStats(hotelId: string, module: string, actor: BiActor): Promise<Record<string, number>> {
    this.assertHotel(hotelId, actor);
    return this.repo.getModuleStats(hotelId, module);
  }

  /** Génère un rapport opérationnel/financier/commercial simple (déterministe). */
  async generateReport(hotelId: string, type: string, filter: KpiFilter, actor: BiActor): Promise<ReportResult> {
    this.assertHotel(hotelId, actor);
    const k = await this.kpis(hotelId, filter, actor);
    const summary: Record<string, number> = {
      occupancyRate: k.occupancyRate, adr: k.adr, revpar: k.revpar, trevpar: k.trevpar,
      totalRevenue: k.totalRevenue, bookings: k.bookings, cancellations: k.cancellations,
      noShow: k.noShow, avgStayDays: k.avgStayDays,
    };
    const rows = [{
      period: `${k.from} → ${k.to}`, occupancyRate: k.occupancyRate, adr: k.adr, revpar: k.revpar,
      trevpar: k.trevpar, totalRevenue: k.totalRevenue, roomRevenue: k.roomRevenue, otherRevenue: k.otherRevenue,
      bookings: k.bookings, cancellations: k.cancellations, noShow: k.noShow, avgStayDays: k.avgStayDays,
      soldRooms: k.soldRooms,
    }];
    return { reportId: type, name: type, category: "OPERATIONAL", type, rows, summary };
  }

  // ---------------------------------------------------------------------------
  // Planification par email
  // ---------------------------------------------------------------------------

  async createSchedule(hotelId: string, input: CreateScheduleInput, actor: BiActor): Promise<BiSchedule> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateSchedule(input);
    const schedule = await this.repo.createSchedule(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "bi.schedule.create", entityType: "BiSchedule", entityId: schedule.id, after: { email: v.email, frequency: v.frequency } });
    return schedule;
  }

  async listSchedules(hotelId: string, actor: BiActor): Promise<BiSchedule[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listSchedules(hotelId);
  }

  async setScheduleActive(hotelId: string, scheduleId: string, isActive: boolean, actor: BiActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setScheduleActive(hotelId, scheduleId, isActive);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertHotel(hotelId: string, actor: BiActor): void {
    if (actor.hotelId !== hotelId) throw new BiError("Accès inter-hôtel refusé");
  }
}
