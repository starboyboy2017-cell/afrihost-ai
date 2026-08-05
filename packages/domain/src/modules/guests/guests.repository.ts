/**
 * Module Guests — Clients : port de persistance.
 */
import type {
  CreateGuestInput,
  Guest,
  GuestFilter,
  GuestPage,
  GuestStay,
  UpdateGuestInput,
} from "./guests.types.js";

export interface GuestsRepository {
  createGuest(organisationId: string, hotelId: string, input: CreateGuestInput): Promise<Guest>;
  updateGuest(hotelId: string, guestId: string, input: UpdateGuestInput): Promise<Guest>;
  archiveGuest(hotelId: string, guestId: string, archivedAt?: Date): Promise<Guest>;
  getGuest(hotelId: string, guestId: string): Promise<Guest | null>;
  /** Recherche rapide par nom/email/téléphone/pièce d'identité. */
  searchGuests(filter: GuestFilter): Promise<GuestPage>;
  /** Historique des séjours (réservations) du client dans l'hôtel. */
  listGuestStays(hotelId: string, guestId: string): Promise<GuestStay[]>;
  /** Recherche par email (détection de doublons). */
  findByEmail(organisationId: string, email: string): Promise<Guest | null>;
}
