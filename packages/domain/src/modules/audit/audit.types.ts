/**
 * Module 4 — Journal d'audit : types de consultation.
 * La capture des logs est déjà assurée par l'infrastructure (@afrihost/core + AuditLog).
 * Ce module fournit la **lecture/consultation** (append-only, jamais de modification).
 */

/** Entrée d'audit lisible. */
export interface AuditLogEntry {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  actorUserId?: string | null;
  action: string; // ex: "reservations.checkin"
  entityType: string; // ex: "Reservation"
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

/** Filtres de consultation du journal. */
export interface AuditFilter {
  organisationId?: string;
  hotelId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

/** Résultat paginé. */
export interface AuditPage {
  entries: AuditLogEntry[];
  total: number;
}
