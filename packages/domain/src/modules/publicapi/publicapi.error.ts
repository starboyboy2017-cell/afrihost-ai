/**
 * Module 30 — API Publique & Marketplace : erreurs métier.
 */
export class PublicApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicApiError";
  }
}
