/**
 * Module 31 — Plateforme Mobile : erreurs métier.
 */
export class MobileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MobileError";
  }
}
