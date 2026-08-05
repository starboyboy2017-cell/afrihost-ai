/**
 * Module 3 — Gestion des réservations : types du domaine.
 */

/** Statuts d'une réservation (BusinessRules BR-5.2). */
export type ReservationStatus =
  | "PROVISIONAL"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW"
  | "WAITLIST";

/** Sources d'une réservation (BusinessRules). */
export type ReservationSource =
  | "DIRECT"
  | "WEBSITE"
  | "OTA"
  | "PHONE"
  | "WALK_IN"
  | "CORPORATE"
  | "AGENCY"
  | "CHANNEL_MANAGER";

/** Réservation (entité). */
export interface Reservation {
  id: string;
  hotelId: string;
  guestId?: string | null;
  roomId?: string | null;
  roomTypeId?: string | null;
  bookingRef: string;
  source: ReservationSource;
  channel?: string | null;
  status: ReservationStatus;
  arrivalDate: Date;
  departureDate: Date;
  adults: number;
  children: number;
  amount: number; // minor units
  taxAmount: number;
  discountAmount: number;
  currency: string;
  notes?: string | null;
  confirmationNumber?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'une réservation. */
export interface CreateReservationInput {
  guestId?: string | null;
  roomId?: string | null;
  roomTypeId?: string | null;
  source: ReservationSource;
  channel?: string | null;
  arrivalDate: Date | string;
  departureDate: Date | string;
  adults?: number;
  children?: number;
  /** Tarif de base par nuit (minor units) — sinon le service calcule depuis le type de chambre. */
  baseRate?: number;
  discountAmount?: number;
  currency?: string;
  notes?: string | null;
  confirmationNumber?: string | null;
}

/** Mise à jour partielle d'une réservation. */
export interface UpdateReservationInput {
  guestId?: string | null;
  roomId?: string | null;
  roomTypeId?: string | null;
  arrivalDate?: Date | string;
  departureDate?: Date | string;
  adults?: number;
  children?: number;
  notes?: string | null;
  confirmationNumber?: string | null;
}

/** Événement d'historique de statut. */
export interface ReservationStatusEvent {
  id: string;
  reservationId: string;
  from?: ReservationStatus | null;
  to: ReservationStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt?: Date;
}
