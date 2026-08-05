/**
 * Module 28 — Moteur de calcul des KPI (déterministe).
 *
 * Calcule ADR, RevPAR, TRevPAR, taux d'occupation, revenus, annulations,
 * no-show, durée moyenne de séjour à partir de données déjà filtrées par RLS.
 * Pure et testable.
 */
import type { HotelKpis, KpiDataSource, TimeSeriesPoint } from "./bi.types.js";

const CONFIRMED = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];
const CANCELLED = ["CANCELLED"];
const NO_SHOW = ["NO_SHOW", "NO_SHOW"];

function daysInRange(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

/** Calcule les KPI d'un hôtel sur une période. */
export function computeKpis(
  hotelId: string,
  from: Date,
  to: Date,
  data: KpiDataSource,
): HotelKpis {
  const nights = daysInRange(from, to);
  const confirmed = data.reservations.filter((r) => CONFIRMED.includes(r.status));
  const cancelled = data.reservations.filter((r) => CANCELLED.includes(r.status));
  const noShowCount = data.reservations.filter((r) => NO_SHOW.includes(r.status)).length;

  // Chambres occupées = somme des nuits confirmées (approx. par réservation).
  const soldRooms = confirmed.reduce((s, r) => {
    const stayNights = Math.max(1, Math.round((r.departureDate.getTime() - r.arrivalDate.getTime()) / 86_400_000));
    return s + stayNights;
  }, 0);

  const roomRevenue = confirmed.reduce((s, r) => s + r.amount, 0);
  const availableRoomNights = data.availableRooms * nights;
  const totalRevenue = roomRevenue + data.otherRevenue;

  const occupancyRate = availableRoomNights > 0 ? (soldRooms / availableRoomNights) * 100 : 0;
  const adr = soldRooms > 0 ? roomRevenue / soldRooms : 0;
  const revpar = availableRoomNights > 0 ? roomRevenue / availableRoomNights : 0;
  const trevpar = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0;

  const avgStay = confirmed.length > 0
    ? confirmed.reduce((s, r) => s + Math.max(1, Math.round((r.departureDate.getTime() - r.arrivalDate.getTime()) / 86_400_000)), 0) / confirmed.length
    : 0;

  return {
    hotelId,
    from: from.toISOString(),
    to: to.toISOString(),
    occupancyRate: Math.round(occupancyRate * 100) / 100,
    adr: Math.round(adr),
    revpar: Math.round(revpar),
    trevpar: Math.round(trevpar),
    totalRevenue,
    roomRevenue,
    otherRevenue: data.otherRevenue,
    bookings: confirmed.length,
    cancellations: cancelled.length,
    noShow: noShowCount,
    avgStayDays: Math.round(avgStay * 100) / 100,
    availableRooms: data.availableRooms,
    soldRooms,
  };
}

/** Convertit une série temporelle brute en points de graphique. */
export function toTimeSeries(points: Array<{ date: Date; value: number }>, labelFormat: (d: Date) => string): TimeSeriesPoint[] {
  return points.map((p) => ({ label: labelFormat(p.date), value: p.value }));
}
