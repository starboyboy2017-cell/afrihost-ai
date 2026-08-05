/**
 * Module Guests — Clients : service métier.
 *
 * Fonctionnalités (BusinessRules BR-8) :
 *   - créer un client (détection de doublon par email) ;
 *   - modifier (informations d'identité) ;
 *   - **archiver** (soft-delete via `archivedAt`) ;
 *   - consulter un client ;
 *   - **recherche rapide** par nom / email / téléphone / pièce d'identité ;
 *   - **historique des séjours** (réservations du client dans l'hôtel).
 *
 * Sécurité & isolation :
 *   - chaque opération exige un `GuestActor` dont `hotelId` correspond au client
 *     (isolation métier, en complément du RLS BD) ;
 *   - RBAC `guests.*` via `requirePermission` au niveau des routes ;
 *   - chaque mutation est journalisée (audit append-only).
 */

import { type EventBus, type AuditTrail } from "@afrihost/core";
import { GuestError } from "./guests.error.js";
import type { GuestsRepository } from "./guests.repository.js";
import type {
  CreateGuestInput,
  Guest,
  GuestFilter,
  GuestPage,
  GuestStay,
  UpdateGuestInput,
} from "./guests.types.js";
import { validateCreateGuest, validateUpdateGuest } from "./guests.validation.js";

/** Contexte d'acteur. */
export interface GuestActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class GuestsService {
  constructor(
    private readonly repo: GuestsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée un client dans un hôtel (détection de doublon par email). */
  async createGuest(hotelId: string, input: CreateGuestInput, actor: GuestActor): Promise<Guest> {
    this.assertHotel(hotelId, actor);
    const validated = validateCreateGuest(input);

    if (validated.email) {
      const dup = await this.repo.findByEmail(actor.organisationId, validated.email.toLowerCase());
      if (dup) throw new GuestError("Un client existe déjà avec cet email");
    }

    const guest = await this.repo.createGuest(actor.organisationId, hotelId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "guests.create",
      entityType: "Guest",
      entityId: guest.id,
      after: { firstName: guest.firstName, lastName: guest.lastName },
    });
    return guest;
  }

  /** Modifie les informations d'un client (isolation + validation). */
  async updateGuest(hotelId: string, guestId: string, input: UpdateGuestInput, actor: GuestActor): Promise<Guest> {
    this.assertHotel(hotelId, actor);
    const validated = validateUpdateGuest(input);
    const before = await this.repo.getGuest(hotelId, guestId);
    if (!before) throw new GuestError("Client introuvable");
    const after = await this.repo.updateGuest(hotelId, guestId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "guests.update",
      entityType: "Guest",
      entityId: guestId,
      before: { firstName: before.firstName, lastName: before.lastName },
      after: { firstName: after.firstName, lastName: after.lastName },
    });
    return after;
  }

  /** Archive un client (soft-delete). */
  async archiveGuest(hotelId: string, guestId: string, actor: GuestActor): Promise<Guest> {
    this.assertHotel(hotelId, actor);
    const guest = await this.repo.archiveGuest(hotelId, guestId, new Date());
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "guests.archive",
      entityType: "Guest",
      entityId: guestId,
      after: { archivedAt: new Date() },
    });
    return guest;
  }

  /** Consulte un client (isolation). */
  async getGuest(hotelId: string, guestId: string, actor: GuestActor): Promise<Guest> {
    this.assertHotel(hotelId, actor);
    const guest = await this.repo.getGuest(hotelId, guestId);
    if (!guest) throw new GuestError("Client introuvable");
    return guest;
  }

  /** Recherche rapide (nom/email/téléphone/identité). */
  async search(hotelId: string, filter: Omit<GuestFilter, "hotelId">, actor: GuestActor): Promise<GuestPage> {
    this.assertHotel(hotelId, actor);
    return this.repo.searchGuests({ ...filter, hotelId });
  }

  /** Historique des séjours du client dans l'hôtel. */
  async stays(hotelId: string, guestId: string, actor: GuestActor): Promise<GuestStay[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listGuestStays(hotelId, guestId);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: GuestActor): void {
    if (actor.hotelId !== hotelId) throw new GuestError("Accès inter-hôtel refusé");
  }
}
