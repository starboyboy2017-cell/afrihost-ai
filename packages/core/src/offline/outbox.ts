/**
 * Outbox de synchronisation (ADR-011/013).
 *
 * En mode offline-first, toute écriture locale est d'abord appliquée à la base locale
 * (IndexedDB) puis enregistrée dans l'**outbox** — une file d'écritures en attente de
 * poussée vers le serveur. À la reconnexion, le moteur de sync pousse l'outbox dans
 * l'ordre, puis tire les mises à jour distantes.
 */

/** Opérations possibles sur une entité synchronisée. */
export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";

/** Entrée d'outbox. */
export interface OutboxEntry<T = unknown> {
  /** Identifiant de l'entrée d'outbox (UUID v7). */
  id: string;
  /** Entité cible. */
  entityType: string;
  /** Identifiant de l'entité (UUID v7 généré côté client). */
  entityId: string;
  /** Opération. */
  operation: SyncOperation;
  /** Données complètes de l'entité à l'instant de l'écriture (pour CREATE/UPDATE). */
  payload: T;
  /** Statut. */
  status: "PENDING" | "SYNCED" | "FAILED";
  /** Nombre de tentatives. */
  attempts: number;
  /** Horodatage de création. */
  createdAt: number;
  /** Horodatage de synchronisation (si synced). */
  syncedAt?: number;
  /** Erreur éventuelle. */
  error?: string;
}

/** Port de stockage de l'outbox (implémentation IndexedDB/Dexie côté client). */
export interface OutboxStore {
  enqueue(entry: Omit<OutboxEntry, "status" | "attempts" | "createdAt">): Promise<void>;
  pending(): Promise<OutboxEntry[]>;
  markSynced(id: string, syncedAt?: number): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  clear(): Promise<void>;
}

/** Implémentation mémoire — pratique pour les tests et le développement. */
export class InMemoryOutboxStore implements OutboxStore {
  private entries = new Map<string, OutboxEntry>();

  async enqueue(entry: Omit<OutboxEntry, "status" | "attempts" | "createdAt">): Promise<void> {
    this.entries.set(entry.id, {
      ...entry,
      status: "PENDING",
      attempts: 0,
      createdAt: Date.now(),
    });
  }

  async pending(): Promise<OutboxEntry[]> {
    return [...this.entries.values()]
      .filter((e) => e.status === "PENDING")
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async markSynced(id: string, syncedAt = Date.now()): Promise<void> {
    const e = this.entries.get(id);
    if (e) {
      e.status = "SYNCED";
      e.syncedAt = syncedAt;
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const e = this.entries.get(id);
    if (e) {
      e.status = "FAILED";
      e.error = error;
      e.attempts += 1;
    }
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}
