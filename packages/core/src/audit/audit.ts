/**
 * Journal d'audit (ADR-012).
 *
 * Principe : **append-only** — on ne peut qu'ajouter des entrées, jamais les modifier ni
 * les supprimer. C'est garanti au niveau base (RLS sans UPDATE/DELETE sur `AuditLog`) ET
 * par cette API qui n'expose qu'une méthode `write`.
 *
 * L'infrastructure d'audit est construite en Phase 0 afin que tous les modules journalisent
 * leurs mutations dès leur création. On expose un port (`AuditWriter`) pour brancher la
 * persistance (Prisma/Supabase en prod, mémoire/console en test).
 */

/** Une entrée d'audit immutable. */
export interface AuditEntry {
  organisationId: string;
  hotelId?: string;
  actorUserId?: string;
  action: string; // ex: "reservation.update"
  entityType: string; // ex: "Reservation"
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

/** Port d'écriture du journal. */
export interface AuditWriter {
  write(entry: AuditEntry): Promise<void>;
}

/** Contrat minimal (append-only) du journal. */
export interface AuditTrail {
  write(entry: AuditEntry): Promise<void>;
  // Les lectures (consultation) sont faites via le module d'audit (module 13).
}

/** Écrivain mémoire/console — utile en dev et en test. */
export class InMemoryAuditWriter implements AuditWriter {
  readonly entries: AuditEntry[] = [];
  async write(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
  async clear(): Promise<void> {
    this.entries.length = 0;
  }
}

/** Écrivain console — pour un débogage rapide. */
export class ConsoleAuditWriter implements AuditWriter {
  async write(entry: AuditEntry): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("[audit]", entry.action, entry.entityType, entry.entityId);
  }
}

/** Journal d'audit applicatif, branché sur un écrivain configurable. */
export class AuditLogger implements AuditTrail {
  constructor(private readonly writer: AuditWriter) {}

  /** Enregistre une action. Retourne une promesse (persistance asynchrone). */
  write(entry: AuditEntry): Promise<void> {
    // Enrichissement d'horodatage géré côté persistance (createdAt).
    return this.writer.write(entry);
  }

  /**
   * Helper : journalise une création.
   * @param ctx contexte d'accès (utilisateur, org, hôtel)
   */
  async logCreate(ctx: {
    organisationId: string;
    hotelId?: string;
    actorUserId?: string;
  }, entityType: string, entityId: string, after: unknown): Promise<void> {
    await this.write({
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.actorUserId,
      action: `${entityType.toLowerCase()}.create`,
      entityType,
      entityId,
      after,
    });
  }

  /**
   * Helper : journalise une mise à jour (avant/après).
   */
  async logUpdate(ctx: {
    organisationId: string;
    hotelId?: string;
    actorUserId?: string;
  }, entityType: string, entityId: string, before: unknown, after: unknown): Promise<void> {
    await this.write({
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.actorUserId,
      action: `${entityType.toLowerCase()}.update`,
      entityType,
      entityId,
      before,
      after,
    });
  }

  /** Helper : journalise une suppression. */
  async logDelete(ctx: {
    organisationId: string;
    hotelId?: string;
    actorUserId?: string;
  }, entityType: string, entityId: string, before: unknown): Promise<void> {
    await this.write({
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.actorUserId,
      action: `${entityType.toLowerCase()}.delete`,
      entityType,
      entityId,
      before,
    });
  }
}
