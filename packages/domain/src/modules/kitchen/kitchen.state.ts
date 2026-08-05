/**
 * Module 14 — Cuisine : machine à états des ordres de préparation.
 *
 * Cycle : NEW → PREPARING → READY → SERVED.
 * Modifications/annulations : NEW/READY → MODIFIED / CANCELLED.
 */

import { KitchenError } from "./kitchen.error.js";
import type { KitchenOrderStatus } from "./kitchen.types.js";

const ALLOWED: Record<KitchenOrderStatus, KitchenOrderStatus[]> = {
  NEW: ["PREPARING", "READY", "MODIFIED", "CANCELLED"],
  PREPARING: ["READY", "MODIFIED", "CANCELLED"],
  READY: ["SERVED", "MODIFIED", "CANCELLED", "PREPARING"],
  SERVED: [],
  MODIFIED: ["PREPARING", "READY", "SERVED"],
  CANCELLED: [],
};

/** Vérifie une transition. Lance sinon. */
export function assertKitchenTransition(from: KitchenOrderStatus, to: KitchenOrderStatus): void {
  if (from === to) return;
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new KitchenError(`Transition d'ordre de cuisine illégale : ${from} → ${to}`);
  }
}

/** Retourne les statuts atteignables. */
export function nextKitchenStatuses(from: KitchenOrderStatus): KitchenOrderStatus[] {
  return [...(ALLOWED[from] ?? [])];
}
