import { describe, it, expect } from "vitest";
import {
  movingAverage,
  trendPercent,
  predictNext,
  confidenceFromCount,
  detectAnomalies,
  buildSuggestions,
  priorityScore,
  prioritizeTasks,
  type OperationalData,
} from "./ai.analytics.js";

describe("ai.analytics", () => {
  it("calcule une moyenne mobile", () => {
    expect(movingAverage([10, 20, 30], 2)).toBe(25);
    expect(movingAverage([], 7)).toBe(0);
    expect(movingAverage([5, 5, 5], 1)).toBe(5);
  });

  it("calcule la tendance en pourcentage", () => {
    // 10,20 | 30,40 → moyennes 15 et 35 → +133%
    expect(trendPercent([10, 20, 30, 40])).toBeCloseTo(133.33, 1);
    expect(trendPercent([5])).toBe(0);
    expect(trendPercent([])).toBe(0);
  });

  it("prédit une valeur future (jamais négative)", () => {
    expect(predictNext([10, 20, 30, 40])).toBeGreaterThan(30);
    expect(predictNext([])).toBe(0);
    expect(predictNext([0, 0, 0])).toBe(0);
  });

  it("calcule une confiance heuristique croissante", () => {
    expect(confidenceFromCount(0)).toBe(0);
    expect(confidenceFromCount(14)).toBe(0.9);
    expect(confidenceFromCount(100)).toBe(0.9);
    expect(confidenceFromCount(7)).toBeGreaterThan(0.3);
  });

  it("détecte une rupture de stock critique", () => {
    const alerts = detectAnomalies({ lowStockItems: [{ name: "Vin", remaining: 0 }] } as unknown as OperationalData);
    expect(alerts.some((a) => a.type === "stock_shortage" && a.severity === "CRITICAL")).toBe(true);
  });

  it("détecte les paiements en retard", () => {
    const alerts = detectAnomalies({ latePayments: 3 } as unknown as OperationalData);
    expect(alerts.some((a) => a.type === "late_payment")).toBe(true);
  });

  it("détecte la surcharge opérationnelle", () => {
    const alerts = detectAnomalies({
      totalRooms: 10, expectedArrivals: new Array(6).fill({}), checkOutsToday: 2,
    } as unknown as OperationalData);
    expect(alerts.some((a) => a.type === "operational_load")).toBe(true);
  });

  it("ne génère pas d'alerte sans anomalie", () => {
    const alerts = detectAnomalies({ lowStockItems: [], latePayments: 0, openIncidents: 0, totalRooms: 10, availableRooms: 5, occupiedRooms: 5 } as unknown as OperationalData);
    expect(alerts.length).toBe(0);
  });

  it("construit des suggestions upgrade pour les VIP", () => {
    const s = buildSuggestions({ availableRooms: 2, expectedArrivals: [{ guestId: "g1", vip: true }] } as unknown as OperationalData);
    expect(s.some((x) => x.kind === "upgrade")).toBe(true);
  });

  it("construit des suggestions cross-sell pour les arrivées", () => {
    const s = buildSuggestions({ expectedArrivals: [{ guestId: "g1" }] } as unknown as OperationalData);
    expect(s.some((x) => x.kind === "cross_sell")).toBe(true);
  });

  it("priorise : critical en retard passe devant info", () => {
    const tasks = [
      { id: "a", title: "info", severity: "INFO", dueInMinutes: 60 },
      { id: "b", title: "critical-late", severity: "CRITICAL", dueInMinutes: -10 },
    ];
    const ordered = prioritizeTasks(tasks);
    expect(ordered[0]!.id).toBe("b");
  });

  it("score de priorité croît avec la sévérité et le retard", () => {
    expect(priorityScore({ id: "c", title: "c", severity: "CRITICAL", dueInMinutes: -5 })).toBeGreaterThan(
      priorityScore({ id: "d", title: "d", severity: "INFO", dueInMinutes: 120 }),
    );
  });
});
