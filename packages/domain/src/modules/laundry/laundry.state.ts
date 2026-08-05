/**
 * Module 11 — Blanchisserie : machine à états du linge.
 *
 * Cycle : CLEAN → DISTRIBUTED → USED → DIRTY → WASHING → DRYING → IRONING → CLEAN.
 * (distribué/utilisé sont liés aux chambres ; lavage → séchage → repassage → propre)
 */

import { LaundryError } from "./laundry.error.js";
import type { LaundryState } from "./laundry.types.js";

const ALLOWED: Record<LaundryState, LaundryState[]> = {
  CLEAN: ["DISTRIBUTED", "DIRTY"],
  DISTRIBUTED: ["USED", "DIRTY", "CLEAN"],
  USED: ["DIRTY", "CLEAN"],
  DIRTY: ["WASHING", "CLEAN"],
  WASHING: ["DRYING", "DIRTY", "CLEAN"],
  DRYING: ["IRONING", "CLEAN"],
  IRONING: ["CLEAN", "DISTRIBUTED"],
};

/** Vérifie une transition. Lance sinon. */
export function assertLaundryTransition(from: LaundryState, to: LaundryState): void {
  if (from === to) return;
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new LaundryError(`Transition d'état de linge illégale : ${from} → ${to}`);
  }
}

/** Retourne les états atteignables. */
export function nextLaundryStates(from: LaundryState): LaundryState[] {
  return [...(ALLOWED[from] ?? [])];
}
