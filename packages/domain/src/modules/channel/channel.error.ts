/**
 * Module 25 — Channel Manager / OTA : erreurs métier.
 */
export class ChannelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelError";
  }
}
