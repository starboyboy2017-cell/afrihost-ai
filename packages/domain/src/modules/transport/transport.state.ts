/**
 * Module 12 — Transport : machine à états des transferts.
 *
 * Cycle : REQUESTED → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED.
 * Assignation : CONFIRMED → ASSIGNED (ou REQUESTED → ASSIGNED).
 * Annulation possible depuis REQUESTED/CONFIRMED/ASSIGNED.
 */

import { TransportError } from "./transport.error.js";
import type { TransferStatus } from "./transport.types.js";

const ALLOWED: Record<TransferStatus, TransferStatus[]> = {
  REQUESTED: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED", "ASSIGNED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Vérifie une transition. Lance sinon. */
export function assertTransferTransition(from: TransferStatus, to: TransferStatus): void {
  if (from === to) return;
  const allowed = ALLOWED[from];
  if (!allowed || !allowed.includes(to)) {
    throw new TransportError(`Transition de transfert illégale : ${from} → ${to}`);
  }
}

/** Retourne les statuts atteignables. */
export function nextTransferStatuses(from: TransferStatus): TransferStatus[] {
  return [...(ALLOWED[from] ?? [])];
}
