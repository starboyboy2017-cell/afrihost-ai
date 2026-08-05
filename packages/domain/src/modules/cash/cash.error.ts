/** Erreur métier du module caisse. */
export class CashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CashError";
  }
}
