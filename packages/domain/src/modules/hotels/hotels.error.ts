/** Erreur métier du module hotels. */
export class HotelsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HotelsError";
  }
}
