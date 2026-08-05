/**
 * Module 8 — Tableau de disponibilité (Front Desk) : service métier.
 *
 * Agrège en TEMPS RÉEL les données des modules 5/6/7 :
 *   - chambres + types (Module 5/6) ;
 *   - états des chambres (Module 6) ;
 *   - séjours actifs + réservations + clients (Module 7).
 *
 * Fournit :
 *   - une **vue par hôtel** avec **isolation complète** (isolation métier + RLS) ;
 *   - des **filtres** (étage, type, statut, période) ;
 *   - une **recherche rapide** par numéro de chambre ou nom de client ;
 *   - des **compteurs** par indicateur visuel.
 *
 * La "mise à jour en temps réel" est assurée côté application : l'écran s'abonne à
 * Supabase Realtime sur les tables Room / Stay / Reservation et re-refait ce query.
 * Ce service produit le snapshot consolidé à tout instant.
 */

import type {
  AvailabilityBoard,
  AvailabilityFilter,
  AvailabilityStatus,
} from "./frontdesk.types.js";
import { deriveStatus, type FrontDeskRepository } from "./frontdesk.repository.js";

/** Contexte d'acteur (isolation multitenant). */
export interface FrontDeskActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class FrontDeskService {
  constructor(private readonly repo: FrontDeskRepository) {}

  /**
   * Renvoie le tableau de disponibilité consolidé d'un hôtel.
   * Isolation : l'acteur ne peut consulter que son propre hôtel.
   */
  async getBoard(hotelId: string, filter: AvailabilityFilter, actor: FrontDeskActor): Promise<AvailabilityBoard> {
    if (actor.hotelId !== hotelId) {
      throw new FrontDeskError("Accès inter-hôtel refusé");
    }
    const { rows, total } = await this.repo.getBoard(hotelId, {
      ...filter,
      limit: Math.min(filter.limit ?? 500, 1000),
      offset: filter.offset ?? 0,
    });

    const counts: Record<AvailabilityStatus, number> = {
      available: 0, occupied: 0, reserved: 0, cleaning: 0, out_of_service: 0, maintenance: 0,
    };
    for (const row of rows) counts[deriveStatus(row.status)]++;
    return { rows, total, counts };
  }
}

/** Erreur métier du module front desk. */
export class FrontDeskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontDeskError";
  }
}
