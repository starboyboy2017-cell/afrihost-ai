/**
 * Module 14 — Cuisine (Kitchen Display System) : types du domaine.
 */

/** Statut d'un ordre de préparation. */
export type KitchenOrderStatus = "NEW" | "PREPARING" | "READY" | "SERVED" | "MODIFIED" | "CANCELLED";

/** Statut d'une ligne d'ordre. */
export type KitchenLineStatus = "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

// Réutilise la priorité définie dans housekeeping (source unique).
import type { Priority } from "../housekeeping/housekeeping.types.js";

/** Poste de cuisine. */
export interface KitchenStation {
  id: string;
  hotelId: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Ordre de préparation. */
export interface KitchenOrder {
  id: string;
  hotelId: string;
  posOrderId: string;
  stationId: string;
  kitchenRef: string;
  status: KitchenOrderStatus;
  priority: Priority;
  notes?: string | null;
  posPointId?: string | null;
  reservationId?: string | null;
  roomId?: string | null;
  receivedAt?: Date;
  startedAt?: Date | null;
  readyAt?: Date | null;
  servedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Ligne d'ordre de préparation. */
export interface KitchenOrderLine {
  id: string;
  kitchenOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  note?: string | null;
  status: KitchenLineStatus;
}

/** Saisie de création d'un poste. */
export interface CreateStationInput {
  name: string;
}

/** Saisie de création d'un ordre de cuisine depuis une commande POS. */
export interface CreateKitchenOrderInput {
  posOrderId: string;
  stationId: string;
  priority?: Priority;
  notes?: string | null;
  posPointId?: string | null;
  reservationId?: string | null;
  roomId?: string | null;
}

/** Filtre de recherche. */
export interface KitchenFilter {
  hotelId: string;
  stationId?: string;
  status?: KitchenOrderStatus;
  priority?: Priority;
  limit?: number;
  offset?: number;
}
