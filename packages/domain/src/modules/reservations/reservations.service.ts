/**
 * Module 3 — Gestion des réservations : service métier.
 *
 * Fonctionnalités :
 *   - créer une réservation (validation, calcul de prix, vérification de disponibilité,
 *     unicité de bookingRef) ;
 *   - modifier (avec isolation multitenant) ;
 *   - transitions de statut via la **machine à états** (BR-5.3) ;
 *   - annulation (BR-5.8), check-in, check-out, no-show ;
 *   - recherche (par statut, dates, client).
 *
 * Sécurité & isolation (conformément à la demande) :
 *   - Chaque opération exige un `ReservationActor` dont `hotelId` doit correspondre à
 *     l'hôtel de la réservation (isolation métier, en complément du RLS BD).
 *   - Les routes API appliquent le RBAC `reservations.*` via `requirePermission`.
 *   - Chaque mutation est journalisée (audit append-only) + émet un événement de domaine.
 */

import {
  DomainEvents,
  type EventBus,
  type AuditTrail,
} from "@afrihost/core";
import { ReservationError } from "./reservations.error.js";
import { assertTransition } from "./reservations.state.js";
import { computePrice } from "./reservations.pricing.js";
import type { ReservationsRepository } from "./reservations.repository.js";
import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
  UpdateReservationInput,
} from "./reservations.types.js";
import { validateCreateReservation, validateUpdateReservation } from "./reservations.validation.js";

/** Noms d'actions d'audit lisibles pour les transitions de statut. */
const STATUS_ACTION: Record<ReservationStatus, string> = {
  PROVISIONAL: "provisional",
  CONFIRMED: "confirm",
  CHECKED_IN: "checkin",
  CHECKED_OUT: "checkout",
  CANCELLED: "cancel",
  NO_SHOW: "no_show",
  WAITLIST: "waitlist",
};

/** Contexte d'acteur (audit + isolation multitenant). */
export interface ReservationActor {
  organisationId: string;
  hotelId: string; // hôtel actif de l'utilisateur
  actorUserId?: string;
}

export class ReservationsService {
  constructor(
    private readonly repo: ReservationsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée une réservation. */
  async createReservation(
    hotelId: string,
    input: CreateReservationInput,
    actor: ReservationActor,
  ): Promise<Reservation> {
    this.assertHotel(hotelId, actor);
    const validated = validateCreateReservation(input);

    // Disponibilité si une chambre précise est demandée (BR-5.5)
    if (validated.roomId) {
      const overlap = await this.repo.hasOverlap(
        hotelId,
        validated.roomId,
        validated.arrivalDate as Date,
        validated.departureDate as Date,
      );
      if (overlap) throw new ReservationError("Chambre déjà réservée sur cette période");
    }

    // Déterminer le taux de base
    let baseRate = validated.baseRate;
    if (baseRate === undefined && validated.roomTypeId) {
      const rt = await this.repo.getRoomTypeBaseRate(hotelId, validated.roomTypeId);
      if (rt === null) throw new ReservationError("Type de chambre introuvable");
      baseRate = rt;
    }
    if (baseRate === undefined) throw new ReservationError("Tarif de base requis (baseRate ou roomTypeId)");

    const vatRate = await this.repo.getHotelVatRate(hotelId);
    const price = computePrice({
      arrivalDate: validated.arrivalDate as Date,
      departureDate: validated.departureDate as Date,
      baseRate,
      discountAmount: validated.discountAmount,
      vatRate,
    });

    const bookingRef = await this.repo.nextBookingRef();
    const reservation = await this.repo.createReservation(hotelId, {
      ...validated,
      bookingRef,
      status: "PROVISIONAL",
      amount: price.total,
      taxAmount: price.taxAmount,
      discountAmount: price.discountAmount,
      currency: validated.currency!,
    });

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "reservations.create",
      entityType: "Reservation",
      entityId: reservation.id,
      after: { status: "PROVISIONAL", bookingRef },
    });
    await this.bus.publish({
      name: DomainEvents.reservationCreated,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId: reservation.id, bookingRef, status: reservation.status },
    });
    return reservation;
  }

  /** Confirme une réservation (PROVISIONAL → CONFIRMED). */
  async confirm(hotelId: string, reservationId: string, actor: ReservationActor): Promise<Reservation> {
    const res = await this.transition(hotelId, reservationId, "CONFIRMED", actor, "Confirmation");
    await this.bus.publish({
      name: DomainEvents.reservationConfirmed,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId, bookingRef: res.bookingRef },
    });
    return res;
  }

  /** Annule une réservation (BR-5.8). */
  async cancel(hotelId: string, reservationId: string, actor: ReservationActor, reason?: string): Promise<Reservation> {
    const res = await this.transition(hotelId, reservationId, "CANCELLED", actor, reason ?? "Annulation");
    await this.bus.publish({
      name: DomainEvents.reservationCancelled,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId, reason },
    });
    return res;
  }

  /** Check-in (CONFIRMED → CHECKED_IN). */
  async checkIn(hotelId: string, reservationId: string, actor: ReservationActor): Promise<Reservation> {
    const res = await this.transition(hotelId, reservationId, "CHECKED_IN", actor, "Check-in");
    await this.bus.publish({
      name: DomainEvents.guestCheckedIn,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId },
    });
    return res;
  }

  /** Check-out (CHECKED_IN → CHECKED_OUT). */
  async checkOut(hotelId: string, reservationId: string, actor: ReservationActor): Promise<Reservation> {
    const res = await this.transition(hotelId, reservationId, "CHECKED_OUT", actor, "Check-out");
    await this.bus.publish({
      name: DomainEvents.guestCheckedOut,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId },
    });
    return res;
  }

  /** Marque un no-show (CONFIRMED → NO_SHOW). */
  async markNoShow(hotelId: string, reservationId: string, actor: ReservationActor): Promise<Reservation> {
    const res = await this.transition(hotelId, reservationId, "NO_SHOW", actor, "No-show");
    await this.bus.publish({
      name: DomainEvents.reservationNoShow,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId },
    });
    return res;
  }

  /** Modifie une réservation (isolation + validation). */
  async updateReservation(
    hotelId: string,
    reservationId: string,
    input: UpdateReservationInput,
    actor: ReservationActor,
  ): Promise<Reservation> {
    this.assertHotel(hotelId, actor);
    const validated = validateUpdateReservation(input);
    const before = await this.repo.getReservation(hotelId, reservationId);
    if (!before) throw new ReservationError("Réservation introuvable");

    // Vérifier la disponibilité si la chambre change
    if (validated.roomId && validated.roomId !== before.roomId) {
      const arrival = validated.arrivalDate ? new Date(validated.arrivalDate) : before.arrivalDate;
      const departure = validated.departureDate ? new Date(validated.departureDate) : before.departureDate;
      const overlap = await this.repo.hasOverlap(hotelId, validated.roomId, arrival, departure, reservationId);
      if (overlap) throw new ReservationError("Chambre déjà réservée sur cette période");
    }

    const after = await this.repo.updateReservation(hotelId, reservationId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "reservations.update",
      entityType: "Reservation",
      entityId: reservationId,
      before: { status: before.status, arrivalDate: before.arrivalDate, departureDate: before.departureDate },
      after: { status: after.status, arrivalDate: after.arrivalDate, departureDate: after.departureDate },
    });
    return after;
  }

  /** Récupère une réservation (isolation). */
  async getReservation(hotelId: string, reservationId: string, actor: ReservationActor): Promise<Reservation> {
    this.assertHotel(hotelId, actor);
    const res = await this.repo.getReservation(hotelId, reservationId);
    if (!res) throw new ReservationError("Réservation introuvable");
    return res;
  }

  /** Liste les réservations (filtres). */
  async listReservations(
    hotelId: string,
    filter: Omit<ReservationFilterInput, "hotelId">,
    actor: ReservationActor,
  ): Promise<Reservation[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listReservations({ hotelId, ...filter });
  }

  /** Historique des statuts. */
  async history(hotelId: string, reservationId: string, actor: ReservationActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.listStatusHistory(hotelId, reservationId);
  }

  /** Transition de statut générique via la machine à états + audit + événement. */
  private async transition(
    hotelId: string,
    reservationId: string,
    to: ReservationStatus,
    actor: ReservationActor,
    reason: string,
  ): Promise<Reservation> {
    this.assertHotel(hotelId, actor);
    const before = await this.repo.getReservation(hotelId, reservationId);
    if (!before) throw new ReservationError("Réservation introuvable");
    assertTransition(before.status, to);
    const after = await this.repo.setStatus(hotelId, reservationId, to, actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: `reservations.${STATUS_ACTION[to]}`,
      entityType: "Reservation",
      entityId: reservationId,
      before: { status: before.status },
      after: { status: to },
    });
    await this.bus.publish({
      name: DomainEvents.roomStatusChanged,
      hotelId,
      organisationId: actor.organisationId,
      data: { reservationId, from: before.status, to, reason },
    });
    return after;
  }

  /** Isolation multitenant : l'hôtel ciblé doit être celui de l'acteur. */
  private assertHotel(hotelId: string, actor: ReservationActor): void {
    if (actor.hotelId !== hotelId) {
      throw new ReservationError("Accès inter-hôtel refusé");
    }
  }
}

export interface ReservationFilterInput {
  status?: ReservationStatus;
  from?: Date;
  to?: Date;
  guestId?: string;
}
