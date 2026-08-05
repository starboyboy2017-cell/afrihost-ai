/**
 * Module 23 — Notifications multicanales : erreurs métier.
 */
export class NotificationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationsError";
  }
}
