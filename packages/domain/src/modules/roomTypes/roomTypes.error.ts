/** Erreur métier du module types de chambres & tarifs. */
export class RoomTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomTypeError";
  }
}
