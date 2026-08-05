/**
 * Module 22 — Programme de fidélité : erreurs métier.
 */
export class LoyaltyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoyaltyError";
  }
}
