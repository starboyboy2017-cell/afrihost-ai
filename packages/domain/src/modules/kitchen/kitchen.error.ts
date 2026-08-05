/** Erreur métier du module cuisine. */
export class KitchenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KitchenError";
  }
}
