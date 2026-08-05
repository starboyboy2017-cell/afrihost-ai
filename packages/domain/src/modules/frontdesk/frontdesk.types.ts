/**
 * Module 8 — Tableau de disponibilité (Front Desk) : types du domaine.
 */

// Réutilise l'état de chambre défini dans le Module 6 (source unique).
import type { RoomStatus } from "../rooms/rooms.types.js";
export type { RoomStatus };

/** Ligne du tableau de disponibilité (une chambre). */
export interface AvailabilityRow {
  roomId: string;
  roomNumber: string;
  floor?: number | null;
  status: RoomStatus;
  roomTypeId: string;
  roomTypeName: string;
  // Occupant / réservation liée (si applicable)
  guestName?: string | null;
  reservationId?: string | null;
  bookingRef?: string | null;
  checkInAt?: Date | null;
  departureDate?: Date | null;
  arrivalDate?: Date | null;
}

/** Indicateur visuel dérivé du statut. */
export type AvailabilityStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "out_of_service"
  | "maintenance";

/** Filtres du tableau. */
export interface AvailabilityFilter {
  floor?: number;
  roomTypeId?: string;
  status?: RoomStatus;
  /** Période : ne montrer que les chambres concernées par [from, to]. */
  from?: Date;
  to?: Date;
  /** Recherche rapide par numéro de chambre OU nom de client. */
  search?: string;
  limit?: number;
  offset?: number;
}

/** Résultat du tableau. */
export interface AvailabilityBoard {
  rows: AvailabilityRow[];
  total: number;
  /** Compteurs par indicateur (pour les filtres visuels). */
  counts: Record<AvailabilityStatus, number>;
}
