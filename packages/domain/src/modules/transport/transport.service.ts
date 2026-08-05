/**
 * Module 12 — Transport, navettes & transferts : service métier.
 *
 * Fonctionnalités :
 *   - véhicules (capacité, plaque, état, disponibilité), internes ou prestataires ;
 *   - chauffeurs (affectation, disponibilité, planning) ;
 *   - **réservations de transferts** (aéroport, gare, ville, personnalisé, aller-retour,
 *     multi-destination) ;
 *   - **affectation** manuelle ou auto (véhicule + chauffeur disponibles) ;
 *   - **cycle de statut** : REQUESTED → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED ;
 *   - **synchro** avec réservations, check-in/out, profils clients (guestId/reservationId) ;
 *   - **facturation** vers le folio de la réservation (markInvoiced).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC transport.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { TransportError } from "./transport.error.js";
import { assertTransferTransition } from "./transport.state.js";
import type { TransportRepository } from "./transport.repository.js";
import type {
  CreateDriverInput,
  CreateTransferInput,
  CreateVehicleInput,
  Driver,
  Transfer,
  TransferFilter,
  TransferStatus,
  Vehicle,
} from "./transport.types.js";
import { validateCreateDriver, validateCreateTransfer, validateCreateVehicle } from "./transport.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface TransportActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class TransportService {
  constructor(
    private readonly repo: TransportRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---- Véhicules ----

  /** Crée un véhicule (interne ou externe). */
  async createVehicle(hotelId: string, input: CreateVehicleInput, actor: TransportActor): Promise<Vehicle> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateVehicle(input);
    const vehicle = await this.repo.createVehicle(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "transport.vehicle.create", entityType: "Vehicle", entityId: vehicle.id,
      after: { name: vehicle.name, plate: vehicle.plate, ownership: vehicle.ownership },
    });
    return vehicle;
  }

  /** Liste les véhicules. */
  async listVehicles(hotelId: string, actor: TransportActor): Promise<Vehicle[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listVehicles(hotelId);
  }

  // ---- Chauffeurs ----

  /** Crée un chauffeur. */
  async createDriver(hotelId: string, input: CreateDriverInput, actor: TransportActor): Promise<Driver> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateDriver(input);
    const driver = await this.repo.createDriver(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "transport.driver.create", entityType: "Driver", entityId: driver.id,
      after: { name: `${driver.firstName} ${driver.lastName}` },
    });
    return driver;
  }

  /** Liste les chauffeurs. */
  async listDrivers(hotelId: string, actor: TransportActor): Promise<Driver[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listDrivers(hotelId);
  }

  // ---- Transferts ----

  /** Crée une réservation de transfert. */
  async createTransfer(hotelId: string, input: CreateTransferInput, actor: TransportActor): Promise<Transfer> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateTransfer(input);
    const transferRef = await this.repo.nextTransferRef();
    const transfer = await this.repo.createTransfer(hotelId, v, transferRef);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "transport.transfer.create", entityType: "Transfer", entityId: transfer.id,
      after: { transferRef, type: v.type, status: "REQUESTED" },
    });
    return transfer;
  }

  /** Change le statut d'un transfert (cycle de vie). */
  async transition(hotelId: string, transferId: string, to: TransferStatus, actor: TransportActor): Promise<Transfer> {
    this.assertHotel(hotelId, actor);
    const transfer = await this.repo.getTransfer(hotelId, transferId);
    if (!transfer) throw new TransportError("Transfert introuvable");
    assertTransferTransition(transfer.status, to);
    const updated = await this.repo.setTransferStatus(hotelId, transferId, to, actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: `transport.transfer.${to.toLowerCase()}`, entityType: "Transfer", entityId: transferId,
      before: { status: transfer.status }, after: { status: to },
    });
    return updated;
  }

  /** Affecte un véhicule + chauffeur à un transfert (manuel ou auto). */
  async assign(hotelId: string, transferId: string, vehicleId: string, driverId: string, actor: TransportActor): Promise<Transfer> {
    this.assertHotel(hotelId, actor);
    const transfer = await this.repo.getTransfer(hotelId, transferId);
    if (!transfer) throw new TransportError("Transfert introuvable");
    if (transfer.status === "COMPLETED" || transfer.status === "CANCELLED") {
      throw new TransportError("Transfert terminé ou annulé");
    }
    if (!(await this.repo.vehicleExists(hotelId, vehicleId))) throw new TransportError("Véhicule introuvable");
    if (!(await this.repo.driverExists(hotelId, driverId))) throw new TransportError("Chauffeur introuvable");

    await this.repo.assign(hotelId, transferId, vehicleId, driverId, actor.actorUserId);
    const updated = await this.repo.setTransferStatus(hotelId, transferId, "ASSIGNED", actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "transport.transfer.assign", entityType: "Transfer", entityId: transferId,
      after: { vehicleId, driverId, status: "ASSIGNED" },
    });
    return updated;
  }

  /**
   * Affectation automatique : choisit le premier véhicule AVAILABLE (capacité >= pax)
   * et le premier chauffeur actif disponible.
   */
  async autoAssign(hotelId: string, transferId: string, actor: TransportActor): Promise<Transfer> {
    this.assertHotel(hotelId, actor);
    const transfer = await this.repo.getTransfer(hotelId, transferId);
    if (!transfer) throw new TransportError("Transfert introuvable");

    const vehicles = await this.repo.listVehicles(hotelId);
    const vehicle = vehicles.find((v) => v.status === "AVAILABLE" && v.capacity >= transfer.paxCount);
    if (!vehicle) throw new TransportError("Aucun véhicule disponible");

    const drivers = await this.repo.listDrivers(hotelId);
    const driver = drivers.find((d) => d.isActive !== false);
    if (!driver) throw new TransportError("Aucun chauffeur disponible");

    await this.repo.assign(hotelId, transferId, vehicle.id, driver.id, actor.actorUserId);
    await this.repo.setVehicleStatus(hotelId, vehicle.id, "IN_USE");
    const updated = await this.repo.setTransferStatus(hotelId, transferId, "ASSIGNED", actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "transport.transfer.auto_assign", entityType: "Transfer", entityId: transferId,
      after: { vehicleId: vehicle.id, driverId: driver.id, status: "ASSIGNED" },
    });
    return updated;
  }

  /** Facture le transfert au folio de la réservation (sync facturation). */
  async markInvoiced(hotelId: string, transferId: string, actor: TransportActor): Promise<Transfer> {
    this.assertHotel(hotelId, actor);
    const transfer = await this.repo.getTransfer(hotelId, transferId);
    if (!transfer) throw new TransportError("Transfert introuvable");
    if (!transfer.reservationId) throw new TransportError("Aucune réservation liée pour la facturation");
    const updated = await this.repo.markTransferInvoiced(hotelId, transferId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "transport.transfer.invoice", entityType: "Transfer", entityId: transferId,
      after: { invoicedToReservation: true, amount: transfer.amount },
    });
    return updated;
  }

  /** Liste les transferts avec filtres. */
  async listTransfers(hotelId: string, filter: Omit<TransferFilter, "hotelId">, actor: TransportActor): Promise<{ transfers: Transfer[]; total: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTransfers({ hotelId, ...filter });
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: TransportActor): void {
    if (actor.hotelId !== hotelId) throw new TransportError("Accès inter-hôtel refusé");
  }
}
