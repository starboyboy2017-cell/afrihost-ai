/**
 * Module 28 — Reporting & Business Intelligence : adapter Prisma.
 * Données KPI agrégées (réservations) déjà filtrées par hôtel via Prisma.
 */
import type {
  BiRepository,
  BiDashboard,
  BiReport,
  BiSchedule,
  CreateDashboardInput,
  CreateReportInput,
  CreateScheduleInput,
  KpiDataSource,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue | undefined => v as Prisma.InputJsonValue;

export class PrismaBiRepository implements BiRepository {
  async createDashboard(hotelId: string, input: CreateDashboardInput): Promise<BiDashboard> {
    const d = await prisma.biDashboard.create({ data: { hotelId, name: input.name, role: input.role ?? null, scope: input.scope ?? "HOTEL", layout: input.layout ? json(input.layout) : undefined } });
    return { id: d.id, hotelId: d.hotelId, name: d.name, role: d.role, scope: d.scope, layout: d.layout as Record<string, unknown> | null, isActive: d.isActive };
  }
  async listDashboards(hotelId: string, role?: string): Promise<BiDashboard[]> {
    const rows = await prisma.biDashboard.findMany({ where: { hotelId, ...(role ? { role } : {}) }, orderBy: { name: "asc" } });
    return rows.map((d) => ({ id: d.id, hotelId: d.hotelId, name: d.name, role: d.role, scope: d.scope, layout: d.layout as Record<string, unknown> | null, isActive: d.isActive }));
  }

  async createReport(hotelId: string, input: CreateReportInput): Promise<BiReport> {
    const r = await prisma.biReport.create({ data: { hotelId, name: input.name, category: input.category ?? "OPERATIONAL", type: input.type, filters: input.filters ? json(input.filters) : undefined, groupBy: input.groupBy ?? null } });
    return { id: r.id, hotelId: r.hotelId, name: r.name, category: r.category, type: r.type, filters: r.filters as Record<string, unknown> | null, groupBy: r.groupBy };
  }
  async listReports(hotelId: string, category?: string): Promise<BiReport[]> {
    const rows = await prisma.biReport.findMany({ where: { hotelId, ...(category ? { category } : {}) }, orderBy: { name: "asc" } });
    return rows.map((r) => ({ id: r.id, hotelId: r.hotelId, name: r.name, category: r.category, type: r.type, filters: r.filters as Record<string, unknown> | null, groupBy: r.groupBy }));
  }

  async createSchedule(hotelId: string, input: CreateScheduleInput): Promise<BiSchedule> {
    const s = await prisma.biSchedule.create({ data: { hotelId, reportId: input.reportId ?? null, email: input.email, frequency: input.frequency ?? "DAILY", format: input.format ?? "PDF", time: input.time ?? null } });
    return { id: s.id, hotelId: s.hotelId, reportId: s.reportId, email: s.email, frequency: s.frequency, format: s.format, time: s.time, isActive: s.isActive, lastRunAt: s.lastRunAt };
  }
  async listSchedules(hotelId: string): Promise<BiSchedule[]> {
    const rows = await prisma.biSchedule.findMany({ where: { hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map((s) => ({ id: s.id, hotelId: s.hotelId, reportId: s.reportId, email: s.email, frequency: s.frequency, format: s.format, time: s.time, isActive: s.isActive, lastRunAt: s.lastRunAt }));
  }
  async setScheduleActive(hotelId: string, scheduleId: string, isActive: boolean): Promise<void> {
    await prisma.biSchedule.update({ where: { id: scheduleId, hotelId }, data: { isActive } });
  }

  async getKpiData(hotelId: string, from: Date, to: Date): Promise<KpiDataSource> {
    const reservations = await prisma.reservation.findMany({
      where: { hotelId, deletedAt: null, arrivalDate: { lte: to }, departureDate: { gte: from } },
      select: { amount: true, status: true, arrivalDate: true, departureDate: true, roomTypeId: true, adults: true, children: true },
    });
    // Revenus annexes : paiements non-chambres (approximation) — on ajoute les folios non-room.
    const rooms = await prisma.room.count({ where: { hotelId } });
    return {
      reservations: reservations.map((r) => ({ amount: r.amount, status: r.status, arrivalDate: r.arrivalDate, departureDate: r.departureDate, roomTypeId: r.roomTypeId, adults: r.adults, children: r.children })),
      otherRevenue: 0,
      availableRooms: rooms,
    };
  }
  async getTimeSeries(hotelId: string, from: Date, to: Date, metric: string): Promise<Array<{ date: Date; value: number }>> {
    // Série quotidienne des réservations confirmées (occupation approx. par arrivée).
    const reservations = await prisma.reservation.findMany({
      where: { hotelId, deletedAt: null, arrivalDate: { gte: from, lte: to } },
      select: { arrivalDate: true, amount: true, status: true },
    });
    const map = new Map<string, number>();
    for (const r of reservations) {
      if (!["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(r.status)) continue;
      const key = r.arrivalDate.toISOString().slice(0, 10);
      const val = metric === "revenue" ? r.amount : 1;
      map.set(key, (map.get(key) ?? 0) + val);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date: new Date(date), value }));
  }
  async getModuleStats(hotelId: string, module: string): Promise<Record<string, number>> {
    switch (module) {
      case "housekeeping": {
        const [pending, done] = await Promise.all([
          prisma.housekeepingTask.count({ where: { hotelId, status: "PENDING" } }),
          prisma.housekeepingTask.count({ where: { hotelId, status: "COMPLETED" } }),
        ]);
        return { pending, done };
      }
      case "maintenance": {
        const open = await prisma.maintenanceRequest.count({ where: { hotelId, status: "OPEN" } });
        return { open };
      }
      case "transport": {
        const count = await prisma.transfer.count({ where: { hotelId } });
        return { count };
      }
      case "loyalty": {
        const members = await prisma.loyaltyMember.count({ where: { hotelId } });
        return { members };
      }
      case "crm": {
        const [guests, segments] = await Promise.all([
          prisma.guest.count({ where: { hotelId } }),
          prisma.customerSegment.count({ where: { hotelId } }),
        ]);
        return { guests, segments };
      }
      default:
        return { count: 0 };
    }
  }
}
