/**
 * Sous-module 33.1 — Bootstrap : erreurs métier.
 */
export class BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapError";
  }
}
