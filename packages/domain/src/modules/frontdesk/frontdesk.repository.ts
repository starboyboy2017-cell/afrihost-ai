/**
 * Module 8 — Tableau de disponibilité : port de lecture (agrégat).
 */
import type { AvailabilityBoard, AvailabilityFilter, AvailabilityRow, AvailabilityStatus, RoomStatus } from "./frontdesk.types.js";

export interface FrontDeskRepository {
  /** Retourne les lignes du tableau pour un hôtel, selon les filtres. */
  getBoard(hotelId: string, filter: AvailabilityFilter): Promise<{ rows: AvailabilityRow[]; total: number }>;
}

/** Dérive l'indicateur visuel d'un statut de chambre. */
export function deriveStatus(status: RoomStatus): AvailabilityStatus {
  switch (status) {
    case "AVAILABLE": return "available";
    case "OCCUPIED": return "occupied";
    case "RESERVED": return "reserved";
    case "DIRTY":
    case "CLEANING":
    case "INSPECTED": return "cleaning";
    case "OUT_OF_SERVICE": return "out_of_service";
    case "OUT_OF_ORDER": return "maintenance";
  }
}
