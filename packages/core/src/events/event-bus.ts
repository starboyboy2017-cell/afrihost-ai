/**
 * EventBus — Event Bus de domaine pour découpler les modules (ADR-006).
 *
 * Les modules émettent des événements de domaine (`publish`) sans connaître leurs
 * consommateurs. Les consommateurs s'abonnent (`subscribe`) sans connaître les émetteurs.
 * Résultat : pas de dépendances fortes entre modules ; un module peut réagir aux actions
 * d'un autre sans import direct de ses services.
 *
 * Contexte multitenant : chaque événement porte `hotelId` et `organisationId` pour que les
 * abonnés puissent filtrer par hôtel.
 */

/** Type générique d'un événement de domaine. */
export interface DomainEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** Nom de l'événement, ex: "reservation.confirmed" */
  name: string;
  /** Hôtel concerné (multitenant). */
  hotelId: string;
  /** Organisation concernée (multitenant). */
  organisationId: string;
  /** Charge utile métier. */
  data: TData;
  /** Horodatage d'émission (UTC). */
  occurredAt: Date;
  /** Identifiant unique de l'événement (déduplication/idempotence). */
  eventId: string;
}

/** Handler d'événement. */
export type EventHandler<TData extends Record<string, unknown>> = (
  event: DomainEvent<TData>,
) => void | Promise<void>;

/** Options d'abonnement. */
export interface SubscribeOptions {
  /** Grouper les erreurs : si false (défaut), une erreur ne bloque pas les autres handlers. */
  swallowErrors?: boolean;
}

interface HandlerEntry {
  handler: EventHandler<any>;
  options: SubscribeOptions;
}

/**
 * EventBus local in-process.
 * Pour un traitement durable/distribué, on combine ce bus avec l'**outbox** (voir
 * `offline/outbox.ts`) : les événements importants sont persistés puis rejoués.
 */
export class EventBus {
  private handlers = new Map<string, HandlerEntry[]>();

  /** Publie un événement : tous les abonnés du nom sont appelés en séquence. */
  async publish<TData extends Record<string, unknown>>(
    event: Omit<DomainEvent<TData>, "occurredAt" | "eventId">,
  ): Promise<void> {
    const full: DomainEvent<TData> = {
      ...event,
      occurredAt: new Date(),
      eventId: crypto.randomUUID(),
    };
    const entries = this.handlers.get(event.name) ?? [];
    for (const { handler, options } of entries) {
      try {
        await handler(full);
      } catch (err) {
        if (options.swallowErrors === true) {
          console.error(`[event-bus] handler for "${event.name}" failed:`, err);
          continue;
        }
        throw err;
      }
    }
  }

  /** Abonne un handler à un événement. Retourne une fonction de désabonnement. */
  subscribe<TData extends Record<string, unknown>>(
    name: string,
    handler: EventHandler<TData>,
    options: SubscribeOptions = {},
  ): () => void {
    const entry: HandlerEntry = { handler: handler as EventHandler<any>, options };
    const list = this.handlers.get(name) ?? [];
    list.push(entry);
    this.handlers.set(name, list);
    return () => {
      const current = this.handlers.get(name) ?? [];
      const idx = current.indexOf(entry);
      if (idx >= 0) current.splice(idx, 1);
    };
  }

  /** Retourne le nombre de handlers pour un événement (utile en test). */
  handlerCount(name: string): number {
    return this.handlers.get(name)?.length ?? 0;
  }

  /** Supprime tous les abonnements (utile en test / hot-reload). */
  clear(): void {
    this.handlers.clear();
  }
}

/** Instance partagée du bus applicatif. */
export const eventBus = new EventBus();
