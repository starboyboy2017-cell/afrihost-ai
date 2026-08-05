/**
 * Module 10 — Maintenance & interventions : service métier.
 *
 * Fonctionnalités :
 *   - **tickets de maintenance** avec priorité et assignation ;
 *   - **cycle de vie** : OPEN → ASSIGNED → IN_PROGRESS → ON_HOLD → RESOLVED → CLOSED ;
 *   - **lien à une chambre** ;
 *   - **mise hors service automatique** de la chambre (OUT_OF_ORDER) si demandé ;
 *   - **remise en service automatique** de la chambre (AVAILABLE) à la clôture ;
 *   - **réassignation** si le technicien est indisponible ;
 *   - **journal d'audit** complet + événements (pour sync temps réel avec Front Desk,
 *     réservations, check-in/out, housekeeping).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC maintenance.*.
 */

import { DomainEvents, type AuditTrail, type EventBus } from "@afrihost/core";
import { MaintenanceError } from "./maintenance.error.js";
import { assertMaintenanceTransition, isResolved } from "./maintenance.state.js";
import type { MaintenanceRepository } from "./maintenance.repository.js";
import type {
  CreateMaintenanceInput,
  MaintenanceFilter,
  MaintenanceRequest,
  MaintenanceStatus,
  UpdateMaintenanceInput,
} from "./maintenance.types.js";
import { validateCreateMaintenance, validateUpdateMaintenance } from "./maintenance.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface MaintenanceActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class MaintenanceService {
  constructor(
    private readonly repo: MaintenanceRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée un ticket (et met éventuellement la chambre hors service). */
  async createRequest(hotelId: string, input: CreateMaintenanceInput, actor: MaintenanceActor): Promise<MaintenanceRequest> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateMaintenance(input);

    if (v.roomId && !(await this.repo.roomExists(hotelId, v.roomId))) {
      throw new MaintenanceError("Chambre introuvable dans cet hôtel");
    }

    const request = await this.repo.createRequest(hotelId, v);

    // Mise hors service automatique de la chambre
    if (v.putRoomOutOfOrder && v.roomId) {
      await this.repo.setRoomStatus(hotelId, v.roomId, "OUT_OF_ORDER");
      await this.repo.logRequestEvent({ requestId: request.id, action: "room_out_of_order", actor: actor.actorUserId, detail: v.roomId });
    }
    await this.repo.logRequestEvent({ requestId: request.id, action: "created", actor: actor.actorUserId });

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "maintenance.create",
      entityType: "MaintenanceRequest",
      entityId: request.id,
      after: { title: request.title, roomId: request.roomId, putRoomOutOfOrder: v.putRoomOutOfOrder },
    });
    await this.bus.publish({
      name: DomainEvents.roomStatusChanged,
      hotelId,
      organisationId: actor.organisationId,
      data: { maintenanceRequestId: request.id, roomId: v.roomId, roomOutOfOrder: v.putRoomOutOfOrder },
    });
    return request;
  }

  /** Affecte / réaffecte un ticket à un technicien. */
  async assign(hotelId: string, requestId: string, assignee: string, actor: MaintenanceActor): Promise<MaintenanceRequest> {
    this.assertHotel(hotelId, actor);
    const request = await this.repo.getRequest(hotelId, requestId);
    if (!request) throw new MaintenanceError("Ticket introuvable");
    assertMaintenanceTransition(request.status, "ASSIGNED");
    const updated = await this.repo.assign(hotelId, requestId, assignee);
    await this.repo.logRequestEvent({ requestId, action: request.assignedTo ? "reassigned" : "assigned", actor: actor.actorUserId, detail: assignee });
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: request.assignedTo ? "maintenance.reassign" : "maintenance.assign",
      entityType: "MaintenanceRequest",
      entityId: requestId,
      before: { assignedTo: request.assignedTo },
      after: { assignedTo: assignee, status: "ASSIGNED" },
    });
    return updated;
  }

  /** Change le statut du ticket (cycle de vie). */
  async transition(hotelId: string, requestId: string, to: MaintenanceStatus, actor: MaintenanceActor): Promise<MaintenanceRequest> {
    this.assertHotel(hotelId, actor);
    const request = await this.repo.getRequest(hotelId, requestId);
    if (!request) throw new MaintenanceError("Ticket introuvable");
    assertMaintenanceTransition(request.status, to);

    const updated = await this.repo.setStatus(hotelId, requestId, to, actor.actorUserId);
    await this.repo.logRequestEvent({ requestId, action: `status_${to.toLowerCase()}`, actor: actor.actorUserId });

    // À la clôture / résolution : remettre la chambre en service (réservable)
    if (isResolved(to) && request.roomId && request.putRoomOutOfOrder && !request.roomRestored) {
      await this.repo.setRoomStatus(hotelId, request.roomId, "AVAILABLE");
      await this.repo.logRequestEvent({ requestId, action: "room_restored", actor: actor.actorUserId, detail: request.roomId });
    }

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: `maintenance.${to.toLowerCase()}`,
      entityType: "MaintenanceRequest",
      entityId: requestId,
      before: { status: request.status },
      after: { status: to },
    });
    await this.bus.publish({
      name: DomainEvents.roomStatusChanged,
      hotelId,
      organisationId: actor.organisationId,
      data: { maintenanceRequestId: requestId, roomId: request.roomId, status: to },
    });
    return updated;
  }

  /** Liste les tickets avec filtres. */
  async listRequests(hotelId: string, filter: Omit<MaintenanceFilter, "hotelId">, actor: MaintenanceActor): Promise<{ requests: MaintenanceRequest[]; total: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRequests({ hotelId, ...filter });
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: MaintenanceActor): void {
    if (actor.hotelId !== hotelId) throw new MaintenanceError("Accès inter-hôtel refusé");
  }
}
