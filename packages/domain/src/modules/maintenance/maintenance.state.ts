/**
 * Module 10 — Maintenance : machine à états des tickets.
 *
 * Cycle : OPEN → ASSIGNED → IN_PROGRESS → (ON_HOLD) → RESOLVED → CLOSED.
 * Assignation : OPEN→ASSIGNED ; réassignation ASSIGNED→ASSIGNED.
 */

import { MaintenanceError } from "./maintenance.error.js";
import type { MaintenanceStatus } from "./maintenance.types.js";

const ALLOWED: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "ON_HOLD", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "ASSIGNED", "ON_HOLD", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED", "ASSIGNED", "CLOSED"],
  ON_HOLD: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS", "ON_HOLD"],
  CLOSED: [],
};

/** Vérifie une transition. Lance sinon. */
export function assertMaintenanceTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
  if (from === to) return;
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new MaintenanceError(`Transition de ticket de maintenance illégale : ${from} → ${to}`);
  }
}

/** Retourne les statuts atteignables. */
export function nextMaintenanceStatuses(from: MaintenanceStatus): MaintenanceStatus[] {
  return [...(ALLOWED[from] ?? [])];
}

/** Vrai si le ticket est résolu/clôturé (chambre remise en service). */
export function isResolved(status: MaintenanceStatus): boolean {
  return status === "RESOLVED" || status === "CLOSED";
}
