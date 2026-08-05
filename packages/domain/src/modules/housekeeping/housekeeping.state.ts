/**
 * Module 9 — Housekeeping : machine à états (BusinessRules BR-7.2).
 *
 * Cycle : PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED.
 * La réaffectation permet de repasser ASSIGNED → ASSIGNED (nouvel agent).
 */

import { HousekeepingError } from "./housekeeping.error.js";
import type { HousekeepingStatus } from "./housekeeping.types.js";

const ALLOWED: Record<HousekeepingStatus, HousekeepingStatus[]> = {
  PENDING: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"],
  ASSIGNED: ["IN_PROGRESS", "COMPLETED", "ASSIGNED"], // ASSIGNED→ASSIGNED = réaffectation
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["VERIFIED"],
  VERIFIED: [],
};

/** Vérifie une transition. Lance sinon. */
export function assertHousekeepingTransition(from: HousekeepingStatus, to: HousekeepingStatus): void {
  if (from === to) return;
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new HousekeepingError(`Transition d'état de ménage illégale : ${from} → ${to}`);
  }
}

/** Retourne les statuts atteignables. */
export function nextHousekeepingStatuses(from: HousekeepingStatus): HousekeepingStatus[] {
  return [...(ALLOWED[from] ?? [])];
}
