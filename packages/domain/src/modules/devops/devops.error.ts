/**
 * Module 34 — DevOps & Sécurité Entreprise : erreurs métier.
 */
export class DevopsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevopsError";
  }
}
