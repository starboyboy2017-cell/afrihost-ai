/**
 * Module 9 — Housekeeping : types du domaine.
 */

/** Statut d'une tâche de ménage (BusinessRules BR-7.2). */
export type HousekeepingStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED";

/** Priorité d'une tâche (BR-7.3). */
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** Tâche de ménage. */
export interface HousekeepingTask {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber?: string; // jointure
  status: HousekeepingStatus;
  priority: Priority;
  assignedTo?: string | null;
  scheduledAt?: Date | null;
  notes?: string | null;
  // Horodatages des étapes (mesure des temps de nettoyage)
  startedAt?: Date | null;
  completedAt?: Date | null;
  verifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création (générée au check-out). */
export interface CreateHousekeepingTaskInput {
  roomId: string;
  priority?: Priority;
  scheduledAt?: Date | string | null;
  notes?: string | null;
  assignedTo?: string | null;
}

/** Mise à jour partielle (notes, planification). */
export interface UpdateHousekeepingTaskInput {
  priority?: Priority;
  scheduledAt?: Date | string | null;
  notes?: string | null;
}

/** Filtre de recherche. */
export interface HousekeepingFilter {
  hotelId: string;
  status?: HousekeepingStatus;
  assignedTo?: string;
  roomId?: string;
  priority?: Priority;
  limit?: number;
  offset?: number;
}
