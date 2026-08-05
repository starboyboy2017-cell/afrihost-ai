/**
 * Module 7 — Check-in / Check-out : types du domaine.
 */

/** Statut d'un séjour physique. */
export type StayStatus = "ACTIVE" | "CHECKED_OUT";

/** Séjour physique. */
export interface Stay {
  id: string;
  hotelId: string;
  reservationId: string;
  guestId?: string | null;
  roomId?: string | null;
  status: StayStatus;
  checkInAt?: Date;
  checkOutAt?: Date | null;
  departureDate: Date;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Entrée d'historique de changement de chambre. */
export interface RoomAssignment {
  id: string;
  stayId: string;
  roomId: string;
  fromDate?: Date;
  toDate?: Date | null;
  reason?: string | null;
  changedBy?: string | null;
  createdAt?: Date;
}

/** Saisie de check-in. */
export interface CheckInInput {
  reservationId: string;
  roomId: string;
  notes?: string | null;
}

/** Saisie de check-out. */
export interface CheckOutInput {
  reservationId: string;
  notes?: string | null;
}

/** Prolongation de séjour. */
export interface ExtendStayInput {
  reservationId: string;
  newDepartureDate: Date | string;
}

/** Changement de chambre. */
export interface ChangeRoomInput {
  reservationId: string;
  newRoomId: string;
  reason?: string | null;
}

/** Vue consolidée d'un séjour (réservation + chambre + séjour). */
export interface StayDetail {
  stay: Stay;
  bookingRef: string;
  guestName?: string | null;
  roomNumber?: string | null;
  roomTypeName?: string | null;
  reservationStatus: string;
}
