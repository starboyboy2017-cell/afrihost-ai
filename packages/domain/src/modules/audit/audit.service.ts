/**
 * Module 4 — Journal d'audit : service de consultation (append-only, ADR-012).
 *
 * Fournit :
 *   - requêtage du journal avec **filtres** (action, entité, acteur, dates, pagination) ;
 *   - **export** (CSV) des entrées filtrées ;
 *   - **isolation multitenant** : l'utilisateur ne voit que les entrées de son hôtel
 *     (ou de son organisation pour un admin), en complément du RLS BD.
 *
 * Le journal reste **immuable** : aucune méthode de modification/suppression.
 */

import type {
  AuditFilter,
  AuditLogEntry,
  AuditPage,
} from "./audit.types.js";
import type { AuditReadRepository } from "./audit.repository.js";

/** Contexte d'accès à la consultation. */
export interface AuditActor {
  organisationId: string;
  hotelId?: string;
  actorUserId?: string;
  isOrgAdmin?: boolean;
}

export class AuditService {
  constructor(private readonly repo: AuditReadRepository) {}

  /**
   * Consulte le journal avec filtres.
   * Isolation : si l'utilisateur n'est pas admin d'org, il ne voit que son hôtel.
   */
  async query(filter: AuditFilter, actor: AuditActor): Promise<AuditPage> {
    const effective: AuditFilter = {
      ...filter,
      // Admin d'org : voit toute l'organisation ; sinon, restreint à son hôtel.
      hotelId: actor.isOrgAdmin ? filter.hotelId : actor.hotelId,
      organisationId: actor.organisationId,
      limit: Math.min(filter.limit ?? 100, 500),
      offset: filter.offset ?? 0,
    };
    return this.repo.query(effective);
  }

  /** Exporte les entrées filtrées au format CSV. */
  async exportCsv(filter: AuditFilter, actor: AuditActor): Promise<string> {
    const page = await this.query({ ...filter, limit: 10000 }, actor);
    return toCsv(page.entries);
  }
}

/** Sérialise les entrées en CSV (en-tête + lignes). */
export function toCsv(entries: AuditLogEntry[]): string {
  const header = ["date", "action", "entityType", "entityId", "actorUserId", "hotelId", "before", "after"];
  const esc = (v: unknown): string => {
    const s = v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = entries.map((e) =>
    [
      esc(e.createdAt.toISOString()),
      esc(e.action),
      esc(e.entityType),
      esc(e.entityId),
      esc(e.actorUserId),
      esc(e.hotelId),
      esc(e.before),
      esc(e.after),
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
