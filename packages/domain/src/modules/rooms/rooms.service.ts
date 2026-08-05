/**
 * Module 6 — Chambres & inventaire physique : service métier.
 *
 * Fonctionnalités (BusinessRules BR-3, BR-4) :
 *   - créer une chambre (liée à un TYPE du Module 5, numéro unique par hôtel) ;
 *   - modifier (type, étage, carte, photos) ;
 *   - **changement d'état via la machine à états** (BR-4.2) + historique ;
 *   - lister / rechercher (par type, état, étage, numéro).
 *
 * Isolation multihôtel : chaque opération exige un acteur dont hotelId correspond ;
 * un type de chambre d'un autre hôtel est refusé. RBAC rooms.* au niveau des routes.
 * Chaque mutation est journalisée (audit) + événement room.status_changed.
 */

import { DomainEvents, type AuditTrail, type EventBus } from "@afrihost/core";
import { RoomError } from "./rooms.error.js";
import { assertRoomTransition, isUnavailable } from "./rooms.state.js";
import type { RoomsRepository } from "./rooms.repository.js";
import type {
  CreateRoomInput,
  Room,
  RoomFilter,
  RoomStatus,
  UpdateRoomInput,
} from "./rooms.types.js";
import { validateCreateRoom, validateUpdateRoom } from "./rooms.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface RoomActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class RoomsService {
  constructor(
    private readonly repo: RoomsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée une chambre (liée à un type du Module 5, isolée par hôtel). */
  async createRoom(hotelId: string, input: CreateRoomInput, actor: RoomActor): Promise<Room> {
    this.assertHotel(hotelId, actor);
    const validated = validateCreateRoom(input);

    // Le type de chambre doit appartenir à CET hôtel (isolation)
    if (!(await this.repo.roomTypeExists(hotelId, validated.roomTypeId))) {
      throw new RoomError("Type de chambre introuvable dans cet hôtel");
    }
    // Numéro unique par hôtel
    if (await this.repo.getRoomByNumber(hotelId, validated.number)) {
      throw new RoomError("Une chambre porte déjà ce numéro");
    }

    const room = await this.repo.createRoom(hotelId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "rooms.create",
      entityType: "Room",
      entityId: room.id,
      after: { number: room.number, roomTypeId: room.roomTypeId, status: room.status },
    });
    return room;
  }

  /** Modifie une chambre (isolation + validation). */
  async updateRoom(hotelId: string, roomId: string, input: UpdateRoomInput, actor: RoomActor): Promise<Room> {
    this.assertHotel(hotelId, actor);
    const validated = validateUpdateRoom(input);
    const before = await this.repo.getRoom(hotelId, roomId);
    if (!before) throw new RoomError("Chambre introuvable");
    if (validated.roomTypeId && !(await this.repo.roomTypeExists(hotelId, validated.roomTypeId))) {
      throw new RoomError("Type de chambre introuvable dans cet hôtel");
    }
    const after = await this.repo.updateRoom(hotelId, roomId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "rooms.update",
      entityType: "Room",
      entityId: roomId,
      before: { number: before.number, roomTypeId: before.roomTypeId },
      after: { number: after.number, roomTypeId: after.roomTypeId },
    });
    return after;
  }

  /** Change l'état d'une chambre via la machine à états + historique. */
  async changeStatus(hotelId: string, roomId: string, to: RoomStatus, actor: RoomActor, reason?: string): Promise<Room> {
    this.assertHotel(hotelId, actor);
    const before = await this.repo.getRoom(hotelId, roomId);
    if (!before) throw new RoomError("Chambre introuvable");
    assertRoomTransition(before.status, to);
    const after = await this.repo.setRoomStatus(hotelId, roomId, to, actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "roomStatus.update",
      entityType: "Room",
      entityId: roomId,
      before: { status: before.status },
      after: { status: to, reason },
    });
    await this.bus.publish({
      name: DomainEvents.roomStatusChanged,
      hotelId,
      organisationId: actor.organisationId,
      data: { roomId, from: before.status, to },
    });
    return after;
  }

  /** Met une chambre en maintenance (OUT_OF_ORDER) — utilisée au check-out/incident. */
  async markOutOfOrder(hotelId: string, roomId: string, actor: RoomActor, reason?: string): Promise<Room> {
    return this.changeStatus(hotelId, roomId, "OUT_OF_ORDER", actor, reason);
  }

  /** Remet une chambre en service (AVAILABLE). */
  async markAvailable(hotelId: string, roomId: string, actor: RoomActor): Promise<Room> {
    return this.changeStatus(hotelId, roomId, "AVAILABLE", actor);
  }

  async getRoom(hotelId: string, roomId: string, actor: RoomActor): Promise<Room> {
    this.assertHotel(hotelId, actor);
    const room = await this.repo.getRoom(hotelId, roomId);
    if (!room) throw new RoomError("Chambre introuvable");
    return room;
  }

  async listRooms(hotelId: string, filter: Omit<RoomFilter, "hotelId">, actor: RoomActor): Promise<{ rooms: Room[]; total: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRooms({ hotelId, ...filter });
  }

  async history(hotelId: string, roomId: string, actor: RoomActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.listRoomStatusHistory(hotelId, roomId);
  }

  /** Expose l'état d'indisponibilité (BR-4.3). */
  isUnavailable(status: RoomStatus): boolean {
    return isUnavailable(status);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: RoomActor): void {
    if (actor.hotelId !== hotelId) throw new RoomError("Accès inter-hôtel refusé");
  }
}
