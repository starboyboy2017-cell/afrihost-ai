/** Erreur métier du module blanchisserie. */
export class LaundryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaundryError";
  }
}
