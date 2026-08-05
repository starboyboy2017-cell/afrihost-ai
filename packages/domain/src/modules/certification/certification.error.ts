/**
 * Module 35 — Certification : erreurs métier.
 */
export class CertificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificationError";
  }
}
