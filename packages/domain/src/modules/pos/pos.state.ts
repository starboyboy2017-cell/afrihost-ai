/**
 * Module 13 — POS : machine à états des commandes.
 *
 * OPEN → PAID (encaissée) ; OPEN → VOID (annulée, aucun paiement) ;
 * PAID → REFUNDED (remboursée). CANCELLED pour annulation partielle/annulation.
 */

import { PosError } from "./pos.error.js";
import type { PosOrderStatus } from "./pos.types.js";

const ALLOWED: Record<PosOrderStatus, PosOrderStatus[]> = {
  OPEN: ["PAID", "VOID", "CANCELLED"],
  PAID: ["REFUNDED"],
  VOID: [],
  REFUNDED: [],
  CANCELLED: [],
};

/** Vérifie une transition. Lance sinon. */
export function assertPosTransition(from: PosOrderStatus, to: PosOrderStatus): void {
  if (from === to) return;
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new PosError(`Transition de commande POS illégale : ${from} → ${to}`);
  }
}
