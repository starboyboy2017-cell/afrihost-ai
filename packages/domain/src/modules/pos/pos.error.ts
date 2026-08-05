/** Erreur métier du module POS. */
export class PosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosError";
  }
}
