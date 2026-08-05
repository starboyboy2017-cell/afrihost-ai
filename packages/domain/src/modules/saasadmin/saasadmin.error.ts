/**
 * Module 33 — Super Administration : erreurs métier.
 */
export class SaasAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaasAdminError";
  }
}
