/** Erreur métier du module pourboires. */
export class TipsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TipsError";
  }
}
