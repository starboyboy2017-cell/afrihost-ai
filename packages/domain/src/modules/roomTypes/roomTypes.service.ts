/**
 * Module 5 — Types de chambres & tarifs flexibles : service métier.
 *
 * Modèle de tarification flexible (anti-refonte) :
 *   - plusieurs TYPES DE CHAMBRES par hôtel ;
 *   - plusieurs PLANS TARIFAIRES par type (BASE / SEASONAL / WEEKEND / PROMOTIONAL) ;
 *   - prix par DEVISE (multi-pays) : RatePlanPrice ;
 *   - restrictions (séjour min/max, réservation avance, capacité) réservables à l'avenir.
 *
 * Isolation multihôtel : chaque opération exige un acteur dont hotelId correspond
 * (rejet des accès inter-hôtels). RBAC roomTypes.* au niveau des routes.
 * Chaque mutation est journalisée (audit append-only).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { RoomTypeError } from "./roomTypes.error.js";
import type { RoomTypesRepository } from "./roomTypes.repository.js";
import type {
  CreateRatePlanInput,
  CreateRoomTypeInput,
  RatePlan,
  RoomType,
  UpdateRatePlanInput,
  UpdateRoomTypeInput,
} from "./roomTypes.types.js";
import {
  validateCreateRatePlan,
  validateCreateRoomType,
  validateUpdateRatePlan,
  validateUpdateRoomType,
} from "./roomTypes.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface RoomTypeActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class RoomTypesService {
  constructor(
    private readonly repo: RoomTypesRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---- Types de chambres ----

  async createRoomType(hotelId: string, input: CreateRoomTypeInput, actor: RoomTypeActor): Promise<RoomType> {
    this.assertHotel(hotelId, actor);
    const validated = validateCreateRoomType(input);
    const rt = await this.repo.createRoomType(hotelId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "roomTypes.create",
      entityType: "RoomType",
      entityId: rt.id,
      after: { name: rt.name, baseRate: rt.baseRate },
    });
    return rt;
  }

  async updateRoomType(hotelId: string, roomTypeId: string, input: UpdateRoomTypeInput, actor: RoomTypeActor): Promise<RoomType> {
    this.assertHotel(hotelId, actor);
    const validated = validateUpdateRoomType(input);
    const before = await this.repo.getRoomType(hotelId, roomTypeId);
    if (!before) throw new RoomTypeError("Type de chambre introuvable");
    const after = await this.repo.updateRoomType(hotelId, roomTypeId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "roomTypes.update",
      entityType: "RoomType",
      entityId: roomTypeId,
      before: { name: before.name },
      after: { name: after.name },
    });
    return after;
  }

  async setRoomTypeActive(hotelId: string, roomTypeId: string, isActive: boolean, actor: RoomTypeActor): Promise<RoomType> {
    this.assertHotel(hotelId, actor);
    const rt = await this.repo.setRoomTypeActive(hotelId, roomTypeId, isActive);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "roomTypes.update",
      entityType: "RoomType",
      entityId: roomTypeId,
      after: { isActive },
    });
    return rt;
  }

  async getRoomType(hotelId: string, roomTypeId: string, actor: RoomTypeActor): Promise<RoomType> {
    this.assertHotel(hotelId, actor);
    const rt = await this.repo.getRoomType(hotelId, roomTypeId);
    if (!rt) throw new RoomTypeError("Type de chambre introuvable");
    return rt;
  }

  async listRoomTypes(hotelId: string, includeInactive: boolean, actor: RoomTypeActor): Promise<RoomType[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRoomTypes(hotelId, includeInactive);
  }

  // ---- Plans tarifaires ----

  async createRatePlan(hotelId: string, input: CreateRatePlanInput, actor: RoomTypeActor): Promise<RatePlan> {
    this.assertHotel(hotelId, actor);
    const validated = validateCreateRatePlan(input);
    // Vérifier que le type de chambre appartient bien à cet hôtel
    const rt = await this.repo.getRoomType(hotelId, validated.roomTypeId);
    if (!rt) throw new RoomTypeError("Type de chambre introuvable");
    const plan = await this.repo.createRatePlan(hotelId, validated);
    if (validated.prices) await this.repo.setRatePlanPrices(plan.id, validated.prices);
    if (validated.restrictions) await this.repo.setRatePlanRestrictions(plan.id, validated.restrictions);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "roomTypes.rateplan.create",
      entityType: "RatePlan",
      entityId: plan.id,
      after: { name: plan.name, type: plan.type },
    });
    return plan;
  }

  async updateRatePlan(hotelId: string, ratePlanId: string, input: UpdateRatePlanInput, actor: RoomTypeActor): Promise<RatePlan> {
    this.assertHotel(hotelId, actor);
    const validated = validateUpdateRatePlan(input);
    const before = await this.repo.getRatePlan(hotelId, ratePlanId);
    if (!before) throw new RoomTypeError("Plan tarifaire introuvable");
    const after = await this.repo.updateRatePlan(hotelId, ratePlanId, validated);
    if (validated.prices !== undefined) await this.repo.setRatePlanPrices(ratePlanId, validated.prices);
    if (validated.restrictions !== undefined) await this.repo.setRatePlanRestrictions(ratePlanId, validated.restrictions);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "roomTypes.rateplan.update",
      entityType: "RatePlan",
      entityId: ratePlanId,
      before: { name: before.name },
      after: { name: after.name },
    });
    return after;
  }

  async setRatePlanActive(hotelId: string, ratePlanId: string, isActive: boolean, actor: RoomTypeActor): Promise<RatePlan> {
    this.assertHotel(hotelId, actor);
    return this.repo.setRatePlanActive(hotelId, ratePlanId, isActive);
  }

  async listRatePlans(hotelId: string, roomTypeId: string | undefined, actor: RoomTypeActor): Promise<RatePlan[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRatePlans(hotelId, roomTypeId);
  }

  /** Résout le prix applicable pour une devise et une date (saison). */
  async resolvePrice(hotelId: string, roomTypeId: string, currency: string, date: Date, actor: RoomTypeActor): Promise<number> {
    this.assertHotel(hotelId, actor);
    return this.repo.resolvePrice(hotelId, roomTypeId, currency, date);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: RoomTypeActor): void {
    if (actor.hotelId !== hotelId) throw new RoomTypeError("Accès inter-hôtel refusé");
  }
}
