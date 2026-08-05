/**
 * Module 2 — Gestion multihôtels : service métier.
 *
 * Fonctionnalités :
 *   - créer un hôtel (avec validation, unicité slug/code) ;
 *   - modifier un hôtel (isolation multitenant) ;
 *   - désactiver / réactiver un hôtel ;
 *   - lister les hôtels (organisation) et les hôtels d'un utilisateur (sélecteur) ;
 *   - affecter un utilisateur à un hôtel avec un rôle (rôles/permissions PAR HÔTEL) ;
 *   - à la création, l'utilisateur créateur devient propriétaire (HOTEL_OWNER) de l'hôtel.
 *
 * Chaque mutation : validation + isolation + **audit append-only** + **événement de domaine**
 * (`hotel.created` / `hotel.updated`). Le RBAC (`hotels.create|update|disable`,
 * `users.assign_role`) est vérifié par les handlers API via `requirePermission`.
 */

import { DomainEvents, type EventBus, type AuditTrail } from "@afrihost/core";
import {
  HotelsError,
} from "./hotels.error.js";
import type { HotelsRepository } from "./hotels.repository.js";
import type {
  CreateHotelInput,
  Hotel,
  HotelSummary,
  UpdateHotelInput,
} from "./hotels.types.js";
import { validateCreateHotel, validateUpdateHotel } from "./hotels.validation.js";

/** Contexte d'acteur (pour audit + isolation multihôtel). */
export interface HotelActor {
  organisationId: string;
  hotelId?: string;
  actorUserId?: string;
}

export class HotelsService {
  constructor(
    private readonly repo: HotelsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /**
   * Crée un hôtel dans une organisation.
   * @param creatorUserId id de l'utilisateur créateur — devient propriétaire.
   */
  async createHotel(
    organisationId: string,
    input: CreateHotelInput,
    actor: HotelActor,
    creatorUserId: string,
  ): Promise<Hotel> {
    const validated = validateCreateHotel(input);

    // Unicité slug / code (dans l'org — les contraintes BD sont globales @unique)
    if (await this.repo.getHotelBySlug(validated.slug)) {
      throw new HotelsError("Slug déjà utilisé");
    }
    if (await this.repo.getHotelByCode(validated.code)) {
      throw new HotelsError("Code déjà utilisé");
    }

    const hotel = await this.repo.createHotel(organisationId, validated);

    // Le créateur devient propriétaire de l'hôtel (per-hotel RBAC).
    const ownerRoleId = await this.repo.findRoleIdByCode(organisationId, "HOTEL_OWNER");
    if (ownerRoleId) {
      await this.repo.ensureOwnerMembership(creatorUserId, hotel.id, ownerRoleId);
    }

    await this.audit.write({
      organisationId,
      hotelId: hotel.id,
      actorUserId: actor.actorUserId,
      action: "hotels.create",
      entityType: "Hotel",
      entityId: hotel.id,
      after: hotel,
    });
    await this.bus.publish({
      name: DomainEvents.hotelCreated,
      hotelId: hotel.id,
      organisationId,
      data: { hotelId: hotel.id, name: hotel.name },
    });
    return hotel;
  }

  /** Modifie un hôtel (isolation : le tenant doit cibler cet hôtel). */
  async updateHotel(
    hotelId: string,
    input: UpdateHotelInput,
    actor: HotelActor,
  ): Promise<Hotel> {
    this.assertTenantForHotel(hotelId, actor);
    const validated = validateUpdateHotel(input);
    const before = await this.repo.getHotel(hotelId);
    if (!before) throw new HotelsError("Hôtel introuvable");
    const after = await this.repo.updateHotel(hotelId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "hotels.update",
      entityType: "Hotel",
      entityId: hotelId,
      before,
      after,
    });
    await this.bus.publish({
      name: DomainEvents.hotelUpdated,
      hotelId,
      organisationId: actor.organisationId,
      data: { hotelId, name: after.name },
    });
    return after;
  }

  /** Désactive un hôtel (plus utilisable). */
  async deactivateHotel(hotelId: string, actor: HotelActor): Promise<Hotel> {
    this.assertTenantForHotel(hotelId, actor);
    const hotel = await this.repo.setHotelActive(hotelId, false);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "hotels.disable",
      entityType: "Hotel",
      entityId: hotelId,
      after: { isActive: false },
    });
    await this.bus.publish({
      name: DomainEvents.hotelUpdated,
      hotelId,
      organisationId: actor.organisationId,
      data: { hotelId, isActive: false },
    });
    return hotel;
  }

  /** Réactive un hôtel. */
  async reactivateHotel(hotelId: string, actor: HotelActor): Promise<Hotel> {
    this.assertTenantForHotel(hotelId, actor);
    const hotel = await this.repo.setHotelActive(hotelId, true);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "hotels.enable",
      entityType: "Hotel",
      entityId: hotelId,
      after: { isActive: true },
    });
    return hotel;
  }

  /** Liste les hôtels d'une organisation (gestion). */
  async listHotels(organisationId: string, _actor: HotelActor): Promise<Hotel[]> {
    return this.repo.listHotelsForOrganisation(organisationId);
  }

  /** Liste les hôtels accessibles à un utilisateur (sélecteur multihôtel). */
  async listHotelsForUser(userId: string): Promise<HotelSummary[]> {
    return this.repo.listHotelsForUser(userId);
  }

  /**
   * Affecte un utilisateur à un hôtel avec un rôle (rôles/permissions PAR HÔTEL).
   * @param targetUserId utilisateur cible (peut différer de l'acteur pour un admin).
   */
  async assignRoleToUser(
    targetUserId: string,
    hotelId: string,
    roleCode: string,
    actor: HotelActor,
  ): Promise<void> {
    this.assertTenantForHotel(hotelId, actor);
    const roleId = await this.repo.findRoleIdByCode(actor.organisationId, roleCode);
    if (!roleId) throw new HotelsError(`Rôle inconnu : ${roleCode}`);
    await this.repo.assignMembership({
      userId: targetUserId,
      hotelId,
      roleCode,
    });
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "hotels.assign_role",
      entityType: "Membership",
      after: { userId: targetUserId, hotelId, roleCode },
    });
  }

  /** Vérifie que l'hôtel ciblé est bien celui du tenant de l'acteur (isolation). */
  private assertTenantForHotel(hotelId: string, actor: HotelActor): void {
    if (actor.hotelId && actor.hotelId !== hotelId) {
      throw new HotelsError("Accès inter-hôtel refusé");
    }
  }
}
