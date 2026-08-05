/**
 * Module 29 — Administration & Paramétrage Global : erreurs métier.
 */
export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminError";
  }
}
