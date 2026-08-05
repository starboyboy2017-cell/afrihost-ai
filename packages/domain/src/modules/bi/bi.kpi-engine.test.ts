import { describe, it, expect } from "vitest";
import { computeKpis, toTimeSeries } from "./bi.kpi-engine.js";
import type { KpiDataSource } from "./bi.types.js";

const from = new Date("2026-08-01");
const to = new Date("2026-08-30"); // 30 nuits

function res(amount: number, status: string, arrival: string, departure: string) {
  return { amount, status, arrivalDate: new Date(arrival), departureDate: new Date(departure) };
}

describe("bi.kpi-engine", () => {
  it("calcule ADR, RevPAR, TRevPAR et l'occupation", () => {
    const data: KpiDataSource = {
      reservations: [
        res(100000, "CONFIRMED", "2026-08-01", "2026-08-03"), // 2 nuits
        res(150000, "CONFIRMED", "2026-08-05", "2026-08-08"), // 3 nuits
        res(60000, "CANCELLED", "2026-08-10", "2026-08-12"),
      ],
      otherRevenue: 50000,
      availableRooms: 10,
    };
    const k = computeKpis("h1", from, to, data);
    expect(k.bookings).toBe(2);
    expect(k.cancellations).toBe(1);
    expect(k.soldRooms).toBe(5); // 2 + 3 nuits
    expect(k.adr).toBe(50000); // 250000 / 5
    // availableRoomNights = 10 * 30 = 300
    expect(k.revpar).toBe(Math.round(250000 / 300)); // ~833
    expect(k.trevpar).toBe(Math.round(300000 / 300)); // ~1000
    expect(k.occupancyRate).toBeCloseTo((5 / 300) * 100, 1);
    expect(k.avgStayDays).toBe(2.5); // (2+3)/2
  });

  it("gère zéro réservation", () => {
    const k = computeKpis("h1", from, to, { reservations: [], otherRevenue: 0, availableRooms: 10 });
    expect(k.occupancyRate).toBe(0);
    expect(k.adr).toBe(0);
    expect(k.revpar).toBe(0);
    expect(k.bookings).toBe(0);
  });

  it("convertis une série temporelle en points", () => {
    const pts = [{ date: new Date("2026-08-01"), value: 50 }, { date: new Date("2026-08-02"), value: 60 }];
    const out = toTimeSeries(pts, (d) => d.toISOString().slice(0, 10));
    expect(out[0]!.label).toBe("2026-08-01");
    expect(out[1]!.value).toBe(60);
  });
});
