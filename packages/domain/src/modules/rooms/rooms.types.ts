/**
 * Module 6 — Chambres & inventaire physique : types du domaine.
 */

/** États d'une chambre (BusinessRules BR-4.1). */
export type RoomStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "DIRTY"
  | "CLEANING"
  | "INSPECTED"
  | "OUT_OF_ORDER"
  | "OUT_OF_SERVICE";

/** Chambre (inventaire physique). */
export interface Room {
  id: string;
  hotelId: string;
  roomTypeId: string;
  number: string;
  floor?: number | null;
  status: RoomStatus;
  isOutOfOrder?: boolean;
  isOutOfService?: boolean;
  keyCardEnabled?: boolean;
  photos?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'une chambre. */
export interface CreateRoomInput {
  roomTypeId: string;
  number: string;
  floor?: number | null;
  keyCardEnabled?: boolean;
  photos?: string[];
  /** Statut initial (défaut AVAILABLE). */
  initialStatus?: RoomStatus;
}

/** Mise à jour partielle d'une chambre (hors statut, géré par machine à états). */
export interface UpdateRoomInput {
  roomTypeId?: string;
  floor?: number | null;
  keyCardEnabled?: boolean;
  photos?: string[];
}

/** Événement d'historique d'état de chambre. */
export interface RoomStatusEvent {
  id: string;
  roomId: string;
  from?: RoomStatus | null;
  to: RoomStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt?: Date;
}

/** Filtre de recherche des chambres. */
export interface RoomFilter {
  hotelId: string;
  roomTypeId?: string;
  status?: RoomStatus;
  floor?: number;
  search?: string; // numéro de chambre
  limit?: number;
  offset?: number;
}
