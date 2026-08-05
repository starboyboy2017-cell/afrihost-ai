/**
 * Module 3 — Réservations : port de persistance (découplé de Prisma).
 */

import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
  ReservationStatusEvent,
  UpdateReservationInput,
} from "./reservations.types.js";

/** Paramètres de recherche. */
export interface ReservationFilter {
  hotelId: string;
  status?: ReservationStatus;
  from?: Date;
  to?: Date;
  guestId?: string;
}

export interface ReservationsRepository {
  createReservation(hotelId: string, input: CreateReservationInput & {
    bookingRef: string;
    status: ReservationStatus;
    amount: number;
    taxAmount: number;
    discountAmount: number;
    currency: string;
  }): Promise<Reservation>;
  updateReservation(hotelId: string, reservationId: string, input: UpdateReservationInput): Promise<Reservation>;
  setStatus(
    hotelId: string,
    reservationId: string,
    status: ReservationStatus,
    changedBy?: string,
  ): Promise<Reservation>;
  getReservation(hotelId: string, reservationId: string): Promise<Reservation | null>;
  getReservationByRef(hotelId: string, bookingRef: string): Promise<Reservation | null>;
  listReservations(filter: ReservationFilter): Promise<Reservation[]>;
  /** Vérifie les chevauchements sur une chambre (double-réservation, BR-5.5). */
  hasOverlap(
    hotelId: string,
    roomId: string,
    arrival: Date,
    departure: Date,
    excludeReservationId?: string,
  ): Promise<boolean>;
  /** Récupère le tarif de base d'un type de chambre (si non fourni). */
  getRoomTypeBaseRate(hotelId: string, roomTypeId: string): Promise<number | null>;
  /** Récupère le taux de TVA de l'hôtel. */
  getHotelVatRate(hotelId: string): Promise<number>;
  /** Historique des changements de statut. */
  listStatusHistory(hotelId: string, reservationId: string): Promise<ReservationStatusEvent[]>;
  /** Génère une référence de réservation unique (ex: AH-2026-00042). */
  nextBookingRef(): Promise<string>;
}
