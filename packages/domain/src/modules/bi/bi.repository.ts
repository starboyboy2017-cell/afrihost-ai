/**
 * Module 28 — Reporting & BI : port de persistance.
 */
import type {
  BiDashboard,
  BiReport,
  BiSchedule,
  CreateDashboardInput,
  CreateReportInput,
  CreateScheduleInput,
  KpiDataSource,
} from "./bi.types.js";

export interface BiRepository {
  // Dashboards
  createDashboard(hotelId: string, input: CreateDashboardInput): Promise<BiDashboard>;
  listDashboards(hotelId: string, role?: string): Promise<BiDashboard[]>;

  // Rapports
  createReport(hotelId: string, input: CreateReportInput): Promise<BiReport>;
  listReports(hotelId: string, category?: string): Promise<BiReport[]>;

  // Planification
  createSchedule(hotelId: string, input: CreateScheduleInput): Promise<BiSchedule>;
  listSchedules(hotelId: string): Promise<BiSchedule[]>;
  setScheduleActive(hotelId: string, scheduleId: string, isActive: boolean): Promise<void>;

  // Données KPI
  getKpiData(hotelId: string, from: Date, to: Date): Promise<KpiDataSource>;
  /** Série temporelle (occupation / revenus) groupée par jour. */
  getTimeSeries(hotelId: string, from: Date, to: Date, metric: string): Promise<Array<{ date: Date; value: number }>>;
  /** Indicateurs d'autres modules (CRM, fidélité, POS, housekeeping...). */
  getModuleStats(hotelId: string, module: string): Promise<Record<string, number>>;
}
