/** Erreur métier du module clients. */
export class GuestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestError";
  }
}
