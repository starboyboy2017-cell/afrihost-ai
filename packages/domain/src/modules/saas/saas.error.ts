/**
 * Module 32 — Billing SaaS : erreurs métier.
 */
export class SaasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaasError";
  }
}
