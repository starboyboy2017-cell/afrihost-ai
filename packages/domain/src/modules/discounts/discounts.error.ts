/** Erreur métier du module remises. */
export class DiscountsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscountsError";
  }
}
