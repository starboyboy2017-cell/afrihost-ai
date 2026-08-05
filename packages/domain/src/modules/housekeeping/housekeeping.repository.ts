/**
 * Module 9 — Housekeeping : port de persistance.
 */
import type {
  CreateHousekeepingTaskInput,
  HousekeepingFilter,
  HousekeepingStatus,
  HousekeepingTask,
  Priority,
  UpdateHousekeepingTaskInput,
} from "./housekeeping.types.js";

export interface HousekeepingRepository {
  createTask(hotelId: string, input: CreateHousekeepingTaskInput): Promise<HousekeepingTask>;
  getTask(hotelId: string, taskId: string): Promise<HousekeepingTask | null>;
  updateTask(hotelId: string, taskId: string, input: UpdateHousekeepingTaskInput): Promise<HousekeepingTask>;
  /** Met à jour le statut + l'horodatage correspondant. */
  setStatus(hotelId: string, taskId: string, status: HousekeepingStatus, changedBy?: string): Promise<HousekeepingTask>;
  /** Réaffecte la tâche à un autre agent (statut ASSIGNED). */
  reassign(hotelId: string, taskId: string, newAssignee: string): Promise<HousekeepingTask>;
  listTasks(filter: HousekeepingFilter): Promise<{ tasks: HousekeepingTask[]; total: number }>;
  /** Vérifie que la chambre appartient à l'hôtel. */
  roomExists(hotelId: string, roomId: string): Promise<boolean>;
  /** Vérifie que la chambre est bien en statut DIRTY (pour création auto). */
  getRoomStatus(hotelId: string, roomId: string): Promise<string | null>;
  /** Journalise un événement de tâche (création, changement, affectation). */
  logTaskEvent(data: { taskId: string; action: string; actor?: string | null; detail?: string | null }): Promise<void>;
}
