/**
 * Module 24 — IA : erreurs métier.
 */
export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}
