/**
 * Module 12 — Transport, navettes & transferts : types du domaine.
 */

/** Propriété d'un véhicule. */
export type VehicleOwnership = "INTERNAL" | "EXTERNAL";

/** Statut d'un véhicule. */
export type VehicleStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";

/** Statut d'une réservation de transfert. */
export type TransferStatus = "REQUESTED" | "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/** Type de trajet. */
export type TransferType = "AIRPORT" | "STATION" | "CITY" | "CUSTOM" | "ROUND_TRIP" | "MULTI_STOP";

/** Véhicule. */
export interface Vehicle {
  id: string;
  hotelId: string;
  name: string;
  plate: string;
  capacity: number;
  ownership: VehicleOwnership;
  providerName?: string | null;
  status: VehicleStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Chauffeur. */
export interface Driver {
  id: string;
  hotelId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  licenseNo?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Réservation de transfert. */
export interface Transfer {
  id: string;
  hotelId: string;
  guestId?: string | null;
  reservationId?: string | null;
  transferRef: string;
  type: TransferType;
  status: TransferStatus;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledAt: Date;
  paxCount: number;
  notes?: string | null;
  amount: number;
  currency?: string | null;
  invoicedToReservation: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'un véhicule. */
export interface CreateVehicleInput {
  name: string;
  plate: string;
  capacity?: number;
  ownership?: VehicleOwnership;
  providerName?: string | null;
  status?: VehicleStatus;
}

/** Saisie de création d'un chauffeur. */
export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  licenseNo?: string | null;
}

/** Saisie de création d'un transfert. */
export interface CreateTransferInput {
  guestId?: string | null;
  reservationId?: string | null;
  type: TransferType;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledAt: Date | string;
  paxCount?: number;
  notes?: string | null;
  amount?: number;
  currency?: string;
}

/** Filtre de recherche des transferts. */
export interface TransferFilter {
  hotelId: string;
  status?: TransferStatus;
  reservationId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
