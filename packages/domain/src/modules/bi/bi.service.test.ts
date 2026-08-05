import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { BiService, type BiActor } from "./bi.service.js";
import { BiError } from "./bi.error.js";
import type { BiRepository } from "./bi.repository.js";
import type {
  BiDashboard, BiReport, BiSchedule, CreateDashboardInput, CreateReportInput, CreateScheduleInput, KpiDataSource,
} from "./bi.types.js";

let seq = 0;

class MemoryRepo implements BiRepository {
  dashboards: BiDashboard[] = [];
  reports: BiReport[] = [];
  schedules: BiSchedule[] = [];
  kpiData: KpiDataSource = { reservations: [], otherRevenue: 0, availableRooms: 10 };
  ts: Array<{ date: Date; value: number }> = [];

  async createDashboard(hotelId: string, input: CreateDashboardInput): Promise<BiDashboard> {
    const d: BiDashboard = { id: `bd-${++seq}`, hotelId, name: input.name, role: input.role ?? null, scope: input.scope ?? "HOTEL", layout: input.layout ?? null, isActive: true };
    this.dashboards.push(d); return d;
  }
  async listDashboards(hotelId: string, role?: string): Promise<BiDashboard[]> { return this.dashboards.filter((d) => d.hotelId === hotelId && (role ? d.role === role : true)); }

  async createReport(hotelId: string, input: CreateReportInput): Promise<BiReport> {
    const r: BiReport = { id: `br-${++seq}`, hotelId, name: input.name, category: input.category ?? "OPERATIONAL", type: input.type, filters: input.filters ?? null, groupBy: input.groupBy ?? null };
    this.reports.push(r); return r;
  }
  async listReports(hotelId: string, category?: string): Promise<BiReport[]> { return this.reports.filter((r) => r.hotelId === hotelId && (category ? r.category === category : true)); }

  async createSchedule(hotelId: string, input: CreateScheduleInput): Promise<BiSchedule> {
    const s: BiSchedule = { id: `bs-${++seq}`, hotelId, reportId: input.reportId ?? null, email: input.email, frequency: input.frequency ?? "DAILY", format: input.format ?? "PDF", time: input.time ?? null, isActive: true, lastRunAt: null };
    this.schedules.push(s); return s;
  }
  async listSchedules(hotelId: string): Promise<BiSchedule[]> { return this.schedules.filter((s) => s.hotelId === hotelId); }
  async setScheduleActive(hotelId: string, scheduleId: string, isActive: boolean): Promise<void> { const s = this.schedules.find((x) => x.id === scheduleId)!; s.isActive = isActive; }

  async getKpiData(hotelId: string, from: Date, to: Date): Promise<KpiDataSource> { return this.kpiData; }
  async getTimeSeries(hotelId: string, from: Date, to: Date, metric: string): Promise<Array<{ date: Date; value: number }>> { return this.ts; }
  async getModuleStats(hotelId: string, module: string): Promise<Record<string, number>> { return { count: 42 }; }
}

const actorH1: BiActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new BiService(repo, audit, bus);
  return { repo, svc };
}

describe("bi.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée un tableau de bord personnalisable par rôle", async () => {
    const { repo, svc } = build();
    const d = await svc.createDashboard("h1", { name: "Dashboard Direction", role: "DIRECTION" }, actorH1);
    expect(d.role).toBe("DIRECTION");
    expect(repo.dashboards.length).toBe(1);
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.listDashboards("h2", undefined, actorH1)).rejects.toThrow(BiError);
  });

  it("crée un rapport personnalisé", async () => {
    const { repo, svc } = build();
    const r = await svc.createReport("h1", { name: "RevPAR mensuel", type: "kpi", category: "FINANCIAL", filters: { channel: "OTA" } }, actorH1);
    expect(r.category).toBe("FINANCIAL");
    expect(repo.reports.length).toBe(1);
  });

  it("calcule les KPI d'un hôtel", async () => {
    const { svc } = build();
    const k = await svc.kpis("h1", { from: "2026-08-01", to: "2026-08-30" }, actorH1);
    expect(k.hotelId).toBe("h1");
    expect(k.occupancyRate).toBe(0);
  });

  it("génère un rapport opérationnel", async () => {
    const { svc } = build();
    const rep = await svc.generateReport("h1", "revenue", { from: "2026-08-01", to: "2026-08-30" }, actorH1);
    expect(rep.type).toBe("revenue");
    expect(rep.rows.length).toBe(1);
    expect(rep.summary.adr).toBeDefined();
  });

  it("calcule les stats d'un autre module", async () => {
    const { svc } = build();
    const s = await svc.moduleStats("h1", "housekeeping", actorH1);
    expect(s.count).toBe(42);
  });

  it("agrège les KPI multi-hôtels (ignore les hôtels hors accès)", async () => {
    const { svc } = build();
    // h1 accessible, h2 interdit → seul h1 est retourné
    const results = await svc.kpisMultiHotel(["h1", "h2"], {}, actorH1);
    expect(results.length).toBe(1);
    expect(results[0]!.hotelId).toBe("h1");
  });

  it("planifie un rapport par email", async () => {
    const { repo, svc } = build();
    const s = await svc.createSchedule("h1", { email: "dir@demo.bj", frequency: "WEEKLY", format: "PDF" }, actorH1);
    expect(s.frequency).toBe("WEEKLY");
    expect(repo.schedules.length).toBe(1);
  });
});
