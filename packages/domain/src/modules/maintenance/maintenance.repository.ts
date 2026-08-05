/**
 * Module 10 — Maintenance : port de persistance.
 */
import type {
  CreateMaintenanceInput,
  MaintenanceFilter,
  MaintenanceRequest,
  MaintenanceStatus,
  UpdateMaintenanceInput,
} from "./maintenance.types.js";

export interface MaintenanceRepository {
  createRequest(hotelId: string, input: CreateMaintenanceInput): Promise<MaintenanceRequest>;
  getRequest(hotelId: string, requestId: string): Promise<MaintenanceRequest | null>;
  updateRequest(hotelId: string, requestId: string, input: UpdateMaintenanceInput): Promise<MaintenanceRequest>;
  /** Met à jour le statut + l'horodatage correspondant + la restauration de chambre. */
  setStatus(hotelId: string, requestId: string, status: MaintenanceStatus, actor?: string): Promise<MaintenanceRequest>;
  /** Réaffecte (ou affecte) un ticket à un technicien. */
  assign(hotelId: string, requestId: string, assignee: string): Promise<MaintenanceRequest>;
  listRequests(filter: MaintenanceFilter): Promise<{ requests: MaintenanceRequest[]; total: number }>;
  roomExists(hotelId: string, roomId: string): Promise<boolean>;
  /** Met la chambre hors service (OUT_OF_ORDER) ou la remet en service (AVAILABLE). */
  setRoomStatus(hotelId: string, roomId: string, status: "OUT_OF_ORDER" | "AVAILABLE"): Promise<void>;
  /** Journalise un événement du ticket. */
  logRequestEvent(data: { requestId: string; action: string; actor?: string | null; detail?: string | null }): Promise<void>;
}
