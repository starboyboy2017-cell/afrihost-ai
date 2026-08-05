/**
 * Module 7 — Check-in / Check-out : service métier (flux complet).
 *
 * Opérations (BusinessRules BR-6) :
 *   - **check-in**  : réservation CONFIRMED → CHECKED_IN ; chambre RESERVED → OCCUPIED ;
 *                     création du séjour (Stay ACTIVE) ;
 *   - **check-out** : réservation CHECKED_IN → CHECKED_OUT ; chambre OCCUPIED → DIRTY ;
 *                     séjour → CHECKED_OUT ; on libère la chambre pour housekeeping ;
 *   - **prolongation** : repousse la date de départ (Stay.departureDate) ;
 *   - **changement de chambre** : libère l'ancienne (→ DIRTY), occupe la nouvelle
 *                     (→ OCCUPIED), trace dans RoomAssignment ;
 *   - **liste des séjours actifs** (pour le tableau de disponibilité temps réel).
 *
 * Isolation multihôtel : chaque opération exige un acteur dont hotelId correspond
 * (rejet des accès inter-hôtels). RBAC reservations.checkin/checkout au niveau routes.
 * Chaque mutation est journalisée (audit) + événements de domaine (guest.checked_in/out).
 */

import { DomainEvents, type AuditTrail, type EventBus } from "@afrihost/core";
import { StayError } from "./stay.error.js";
import type { StayRepository } from "./stay.repository.js";
import type {
  ChangeRoomInput,
  CheckInInput,
  CheckOutInput,
  ExtendStayInput,
  Stay,
  StayDetail,
} from "./stay.types.js";
import {
  validateChangeRoom,
  validateCheckIn,
  validateCheckOut,
  validateExtendStay,
} from "./stay.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface StayActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class StayService {
  constructor(
    private readonly repo: StayRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Check-in : active le séjour, occupe la chambre. */
  async checkIn(hotelId: string, input: CheckInInput, actor: StayActor): Promise<Stay> {
    this.assertHotel(hotelId, actor);
    const v = validateCheckIn(input);

    const res = await this.repo.getReservation(hotelId, v.reservationId);
    if (!res) throw new StayError("Réservation introuvable");
    // Un séjour existe déjà ? (double check-in)
    if (await this.repo.getStayByReservation(hotelId, v.reservationId)) {
      throw new StayError("Séjour déjà en cours");
    }
    if (res.status !== "CONFIRMED") throw new StayError(`Check-in impossible depuis le statut ${res.status}`);

    const room = await this.repo.getRoom(hotelId, v.roomId);
    if (!room) throw new StayError("Chambre introuvable");
    if (room.status !== "RESERVED" && room.status !== "AVAILABLE") {
      throw new StayError(`Chambre non disponible pour check-in (${room.status})`);
    }

    // Occuper la chambre + statut réservation
    await this.repo.setRoomStatus(hotelId, v.roomId, "OCCUPIED", actor.actorUserId);
    await this.repo.setReservationStatus(hotelId, v.reservationId, "CHECKED_IN", actor.actorUserId);
    if (!res.roomId) await this.repo.updateReservationRoom(hotelId, v.reservationId, v.roomId);

    const stay = await this.repo.createStay({
      hotelId,
      reservationId: v.reservationId,
      guestId: res.guestId,
      roomId: v.roomId,
      departureDate: res.departureDate,
    });

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "reservations.checkin",
      entityType: "Reservation",
      entityId: v.reservationId,
      after: { status: "CHECKED_IN", roomId: v.roomId },
    });
    await this.bus.publish({
      name: DomainEvents.guestCheckedIn,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId: v.reservationId, roomId: v.roomId, stayId: stay.id },
    });
    return stay;
  }

  /** Check-out : clôture le séjour, libère la chambre (→ DIRTY). */
  async checkOut(hotelId: string, input: CheckOutInput, actor: StayActor): Promise<Stay> {
    this.assertHotel(hotelId, actor);
    const v = validateCheckOut(input);

    const res = await this.repo.getReservation(hotelId, v.reservationId);
    if (!res) throw new StayError("Réservation introuvable");
    if (res.status !== "CHECKED_IN") throw new StayError(`Check-out impossible depuis le statut ${res.status}`);

    const stay = await this.repo.getStayByReservation(hotelId, v.reservationId);
    if (!stay || stay.status !== "ACTIVE") throw new StayError("Séjour actif introuvable");

    // Libérer la chambre (→ DIRTY pour housekeeping) + statut réservation
    if (stay.roomId) await this.repo.setRoomStatus(hotelId, stay.roomId, "DIRTY", actor.actorUserId);
    await this.repo.setReservationStatus(hotelId, v.reservationId, "CHECKED_OUT", actor.actorUserId);
    const updated = await this.repo.updateStay(hotelId, stay.id, {
      status: "CHECKED_OUT",
      checkOutAt: new Date(),
      notes: v.notes ?? undefined,
    });

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "reservations.checkout",
      entityType: "Reservation",
      entityId: v.reservationId,
      before: { status: "CHECKED_IN" },
      after: { status: "CHECKED_OUT", roomId: stay.roomId },
    });
    await this.bus.publish({
      name: DomainEvents.guestCheckedOut,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId: v.reservationId, stayId: stay.id },
    });
    return updated;
  }

  /** Prolongation de séjour : repousse la date de départ. */
  async extendStay(hotelId: string, input: ExtendStayInput, actor: StayActor): Promise<Stay> {
    this.assertHotel(hotelId, actor);
    const v = validateExtendStay(input);

    const stay = await this.repo.getStayByReservation(hotelId, v.reservationId);
    if (!stay || stay.status !== "ACTIVE") throw new StayError("Séjour actif introuvable");

    const newDeparture = new Date(v.newDepartureDate);
    if (newDeparture.getTime() <= stay.departureDate.getTime()) {
      throw new StayError("La nouvelle date de départ doit être postérieure");
    }

    const updated = await this.repo.updateStay(hotelId, stay.id, { departureDate: newDeparture });
    await this.repo.updateReservationDeparture(hotelId, v.reservationId, newDeparture);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "reservations.extend",
      entityType: "Reservation",
      entityId: v.reservationId,
      before: { departureDate: stay.departureDate },
      after: { departureDate: newDeparture },
    });
    return updated;
  }

  /** Changement de chambre en cours de séjour. */
  async changeRoom(hotelId: string, input: ChangeRoomInput, actor: StayActor): Promise<Stay> {
    this.assertHotel(hotelId, actor);
    const v = validateChangeRoom(input);

    const stay = await this.repo.getStayByReservation(hotelId, v.reservationId);
    if (!stay || stay.status !== "ACTIVE") throw new StayError("Séjour actif introuvable");
    if (!stay.roomId) throw new StayError("Aucune chambre assignée au séjour");
    if (stay.roomId === v.newRoomId) throw new StayError("Nouvelle chambre identique à l'actuelle");

    const newRoom = await this.repo.getRoom(hotelId, v.newRoomId);
    if (!newRoom) throw new StayError("Nouvelle chambre introuvable");
    if (newRoom.status !== "AVAILABLE" && newRoom.status !== "RESERVED") {
      throw new StayError(`Nouvelle chambre non disponible (${newRoom.status})`);
    }

    // Libérer l'ancienne, occuper la nouvelle, tracer le changement
    await this.repo.setRoomStatus(hotelId, stay.roomId, "DIRTY", actor.actorUserId);
    await this.repo.setRoomStatus(hotelId, v.newRoomId, "OCCUPIED", actor.actorUserId);
    const updated = await this.repo.updateStay(hotelId, stay.id, { roomId: v.newRoomId });
    await this.repo.updateReservationRoom(hotelId, v.reservationId, v.newRoomId);
    await this.repo.addRoomAssignment({
      stayId: stay.id,
      roomId: v.newRoomId,
      reason: v.reason ?? null,
      changedBy: actor.actorUserId,
    });

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "reservations.room_change",
      entityType: "Stay",
      entityId: stay.id,
      before: { roomId: stay.roomId },
      after: { roomId: v.newRoomId },
    });
    return updated;
  }

  /** Liste les séjours actifs (alimentation du tableau de disponibilité). */
  async listActive(hotelId: string, actor: StayActor): Promise<StayDetail[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listActiveStays(hotelId);
  }

  /** Historique des changements de chambre. */
  async roomAssignments(hotelId: string, reservationId: string, actor: StayActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.listRoomAssignments(hotelId, reservationId);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: StayActor): void {
    if (actor.hotelId !== hotelId) throw new StayError("Accès inter-hôtel refusé");
  }
}
