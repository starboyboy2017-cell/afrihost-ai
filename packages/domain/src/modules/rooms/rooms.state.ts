/**
 * Module 6 — Chambres : machine à états (BusinessRules BR-4.2).
 *
 * Transitions autorisées :
 *   AVAILABLE → RESERVED        (réservation confirmée)
 *   RESERVED  → OCCUPIED        (check-in)
 *   RESERVED  → AVAILABLE       (annulation)
 *   OCCUPIED  → DIRTY           (check-out)
 *   DIRTY     → CLEANING        (housekeeping)
 *   CLEANING  → INSPECTED       (inspection)
 *   INSPECTED → AVAILABLE       (vérifié)
 *   *         → OUT_OF_ORDER / OUT_OF_SERVICE   (maintenance)
 *   OUT_OF_ORDER/OUT_OF_SERVICE → AVAILABLE     (réparation)
 * Toute autre transition est rejetée.
 */

import { RoomError } from "./rooms.error.js";
import type { RoomStatus } from "./rooms.types.js";

const ALLOWED: Record<RoomStatus, RoomStatus[]> = {
  AVAILABLE: ["RESERVED", "OUT_OF_ORDER", "OUT_OF_SERVICE"],
  RESERVED: ["OCCUPIED", "AVAILABLE", "OUT_OF_ORDER", "OUT_OF_SERVICE"],
  OCCUPIED: ["DIRTY", "OUT_OF_ORDER", "OUT_OF_SERVICE"],
  DIRTY: ["CLEANING", "OUT_OF_ORDER", "OUT_OF_SERVICE"],
  CLEANING: ["INSPECTED", "DIRTY", "OUT_OF_ORDER", "OUT_OF_SERVICE"],
  INSPECTED: ["AVAILABLE", "OUT_OF_ORDER", "OUT_OF_SERVICE"],
  OUT_OF_ORDER: ["AVAILABLE", "OUT_OF_SERVICE"],
  OUT_OF_SERVICE: ["AVAILABLE"],
};

/** Vérifie qu'une transition est autorisée. Lance sinon. */
export function assertRoomTransition(from: RoomStatus, to: RoomStatus): void {
  if (from === to) return; // no-op
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new RoomError(`Transition d'état de chambre illégale : ${from} → ${to}`);
  }
}

/** Retourne les états atteignables. */
export function nextRoomStatuses(from: RoomStatus): RoomStatus[] {
  return [...(ALLOWED[from] ?? [])];
}

/** True si la chambre est indisponible à la réservation. */
export function isUnavailable(status: RoomStatus): boolean {
  return status === "OUT_OF_ORDER" || status === "OUT_OF_SERVICE";
}
