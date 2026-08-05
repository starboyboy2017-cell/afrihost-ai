/** Erreur métier du module séjours. */
export class StayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StayError";
  }
}
