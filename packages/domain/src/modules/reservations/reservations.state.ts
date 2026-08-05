/**
 * Module 3 — Gestion des réservations : machine à états (BusinessRules BR-5.3).
 *
 * Transitions autorisées :
 *   PROVISIONAL → CONFIRMED | CANCELLED
 *   CONFIRMED   → CHECKED_IN | CANCELLED | NO_SHOW
 *   CHECKED_IN  → CHECKED_OUT | CANCELLED
 *   WAITLIST    → PROVISIONAL
 * Toute autre transition est rejetée.
 */

import { ReservationError } from "./reservations.error.js";
import type { ReservationStatus } from "./reservations.types.js";

const ALLOWED: Record<ReservationStatus, ReservationStatus[]> = {
  PROVISIONAL: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT", "CANCELLED"],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
  WAITLIST: ["PROVISIONAL"],
};

/** Vérifie qu'une transition est autorisée. Lance sinon. */
export function assertTransition(from: ReservationStatus, to: ReservationStatus): void {
  if (from === to) return; // no-op accepté (idempotent)
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ReservationError(`Transition de statut illégale : ${from} → ${to}`);
  }
}

/** Retourne les statuts atteignables depuis un statut donné. */
export function nextStatuses(from: ReservationStatus): ReservationStatus[] {
  return [...(ALLOWED[from] ?? [])];
}
