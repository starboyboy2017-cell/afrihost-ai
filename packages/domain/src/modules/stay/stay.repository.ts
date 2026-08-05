/**
 * Module 7 — Séjours : port de persistance.
 */
import type {
  RoomAssignment,
  Stay,
  StayDetail,
  StayStatus,
} from "./stay.types.js";

export interface StayRepository {
  // Réservation
  getReservation(hotelId: string, reservationId: string): Promise<{
    id: string;
    status: string;
    guestId: string | null;
    roomId: string | null;
    bookingRef: string;
    arrivalDate: Date;
    departureDate: Date;
  } | null>;
  setReservationStatus(hotelId: string, reservationId: string, status: string, changedBy?: string): Promise<void>;
  updateReservationDeparture(hotelId: string, reservationId: string, departureDate: Date): Promise<void>;
  updateReservationRoom(hotelId: string, reservationId: string, roomId: string | null): Promise<void>;

  // Chambre
  getRoom(hotelId: string, roomId: string): Promise<{ id: string; status: string; number: string; roomTypeId: string } | null>;
  setRoomStatus(hotelId: string, roomId: string, status: string, changedBy?: string): Promise<void>;

  // Séjour
  createStay(data: {
    hotelId: string;
    reservationId: string;
    guestId: string | null;
    roomId: string;
    departureDate: Date;
  }): Promise<Stay>;
  getStayByReservation(hotelId: string, reservationId: string): Promise<Stay | null>;
  updateStay(hotelId: string, stayId: string, data: Partial<Pick<Stay, "roomId" | "status" | "checkOutAt" | "departureDate" | "notes">>): Promise<Stay>;
  listActiveStays(hotelId: string): Promise<StayDetail[]>;
  /** Historique des changements de chambre d'un séjour. */
  listRoomAssignments(hotelId: string, reservationId: string): Promise<RoomAssignment[]>;
  addRoomAssignment(data: { stayId: string; roomId: string; reason?: string | null; changedBy?: string }): Promise<void>;
}
