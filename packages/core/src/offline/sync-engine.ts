/**
 * Moteur de synchronisation (ADR-011).
 *
 * Objectif : l'application doit fonctionner hors-ligne et synchroniser les données dès que
 * la connexion revient, **sans perte ni doublon**.
 *
 * Stratégie de conflit : **Last-Write-Wins (LWW)** sur `updatedAt` (ADR-013) + garde-fous
 * métier (idempotence — un événement déjà consommé n'est pas réappliqué).
 *
 * Déroulement d'une synchronisation :
 *   1. PUSH : on pousse les écritures locales (outbox) vers le serveur, dans l'ordre.
 *   2. PULL : on tire les mises à jour distantes (delta depuis lastSyncAt).
 *   3. Résolution : pour chaque entité, on garde la version dont `updatedAt` est le plus
 *      récent (LWW) ; les DELETE locaux sont propagés via `deletedAt`.
 */

import type { OutboxStore } from "./outbox.js";

/** Résultat de synchronisation. */
export interface SyncResult {
  pushed: number;
  pulled: number;
  conflictsResolved: number;
  errors: number;
  at: number;
}

/** Entité synchronisable (contrat minimal partagé). */
export interface SyncableEntity {
  id: string;
  updatedAt: number | string | Date;
  deletedAt?: number | string | Date | null;
}

/** Port de communication avec le serveur (implémentation : API route handler). */
export interface SyncClient {
  /**
   * Pousse une écriture locale vers le serveur. Retourne l'entité distante (telle que
   * persistée côté serveur, avec son `updatedAt`).
   */
  push(entityType: string, operation: "CREATE" | "UPDATE" | "DELETE", entity: SyncableEntity):
    Promise<{ ok: boolean; remote?: SyncableEntity; error?: string }>;

  /**
   * Tire les changements distants depuis un point de reprise (delta sync).
   */
  pull(since: number, hotelId: string): Promise<{ entities: SyncableEntity[] }>;
}

function toTs(v: number | string | Date): number {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  return new Date(v).getTime();
}

/** Calcule le timestamp le plus récent entre deux entités (LWW). */
export function lastWriteWins<T extends SyncableEntity>(local: T, remote: T): T {
  return toTs(local.updatedAt) >= toTs(remote.updatedAt) ? local : remote;
}

/**
 * Moteur de sync. `storeLocal`/`readLocal` sont des fonctions d'accès à la base locale
 * (IndexedDB côté client) fournies par l'adaptateur.
 */
export class SyncEngine {
  constructor(
    private readonly outbox: OutboxStore,
    private readonly client: SyncClient,
  ) {}

  /**
   * Exécute une synchronisation complète pour un hôtel.
   * @param hotelId hôtel concerné
   * @param lastSyncAt horodatage du dernier pull (0 = full sync)
   * @param upsertLocal fonction d'écriture d'une entité dans la base locale
   */
  async sync<T extends SyncableEntity>(
    hotelId: string,
    lastSyncAt: number,
    upsertLocal: (entity: T) => Promise<void>,
  ): Promise<SyncResult> {
    const result: SyncResult = { pushed: 0, pulled: 0, conflictsResolved: 0, errors: 0, at: Date.now() };

    // 1) PUSH — vider l'outbox local
    const pending = await this.outbox.pending();
    for (const entry of pending) {
      try {
        const outcome = await this.client.push(entry.entityType, entry.operation, entry.payload as SyncableEntity);
        if (outcome.ok) {
          await this.outbox.markSynced(entry.id);
          result.pushed += 1;
        } else {
          // Le serveur a rejeté (ex: conflit métier). On considère la version distante.
          if (outcome.remote) {
            await upsertLocal(outcome.remote as T);
            result.conflictsResolved += 1;
          }
          await this.outbox.markSynced(entry.id);
          result.pushed += 1;
        }
      } catch (err) {
        await this.outbox.markFailed(entry.id, String(err));
        result.errors += 1;
      }
    }

    // 2) PULL — tirer le delta distant et appliquer LWW
    try {
      const { entities } = await this.client.pull(lastSyncAt, hotelId);
      for (const remote of entities) {
        // On laisse l'adaptateur local décider du LWW (il connaît l'entité locale existante).
        await upsertLocal(remote as T);
        result.pulled += 1;
      }
    } catch (err) {
      result.errors += 1;
      console.error("[sync] pull failed:", err);
    }

    return result;
  }
}
