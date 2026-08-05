/**
 * Module 10 — Maintenance & interventions : types du domaine.
 */

/** Statut d'un ticket de maintenance. */
export type MaintenanceStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED" | "CLOSED";

/** Priorité d'un ticket. */
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** Ticket de maintenance. */
export interface MaintenanceRequest {
  id: string;
  hotelId: string;
  roomId?: string | null;
  roomNumber?: string | null; // jointure
  title: string;
  description?: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedTo?: string | null;
  putRoomOutOfOrder: boolean;
  roomRestored: boolean;
  startedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'un ticket. */
export interface CreateMaintenanceInput {
  roomId?: string | null;
  title: string;
  description?: string | null;
  priority?: MaintenancePriority;
  /** Mettre la chambre hors service automatiquement. */
  putRoomOutOfOrder?: boolean;
  assignedTo?: string | null;
}

/** Mise à jour partielle. */
export interface UpdateMaintenanceInput {
  title?: string;
  description?: string | null;
  priority?: MaintenancePriority;
  assignedTo?: string | null;
}

/** Filtre de recherche. */
export interface MaintenanceFilter {
  hotelId: string;
  status?: MaintenanceStatus;
  roomId?: string;
  assignedTo?: string;
  priority?: MaintenancePriority;
  limit?: number;
  offset?: number;
}
