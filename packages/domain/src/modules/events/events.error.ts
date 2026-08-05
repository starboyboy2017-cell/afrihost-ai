/**
 * Module 27 — Événements & Groupes : erreurs métier.
 */
export class EventsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventsError";
  }
}
