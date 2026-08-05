/** Erreur métier du module housekeeping. */
export class HousekeepingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HousekeepingError";
  }
}
