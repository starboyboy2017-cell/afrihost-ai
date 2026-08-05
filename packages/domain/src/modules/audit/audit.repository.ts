/**
 * Module 4 — Journal d'audit : port de lecture (append-only).
 */
import type { AuditFilter, AuditPage } from "./audit.types.js";

export interface AuditReadRepository {
  query(filter: AuditFilter): Promise<AuditPage>;
}
