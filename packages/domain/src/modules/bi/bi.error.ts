/**
 * Module 28 — Reporting & BI : erreurs métier.
 */
export class BiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BiError";
  }
}
