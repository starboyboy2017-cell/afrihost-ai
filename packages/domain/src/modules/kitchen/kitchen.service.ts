/**
 * Module 14 — Cuisine (Kitchen Display System) : service métier.
 *
 * Fonctionnalités :
 *   - **réception des commandes** POS (création d'un ordre de préparation) ;
 *   - **répartition par poste** (grillard, froid, plats, desserts) ;
 *   - **gestion des priorités** ;
 *   - **cycle** : NEW → PREPARING → READY → SERVED ;
 *   - **modifications / annulations** avec traçabilité ;
 *   - **mises à jour en temps réel** (événements) ;
 *   - intégration réservations, chambres, front desk, room service.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC kitchen.*.
 * Chaque mutation est journalisée (audit) + événement KitchenOrderEvent.
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { KitchenError } from "./kitchen.error.js";
import { assertKitchenTransition } from "./kitchen.state.js";
import type { KitchenRepository } from "./kitchen.repository.js";
import type {
  CreateKitchenOrderInput,
  CreateStationInput,
  KitchenFilter,
  KitchenOrder,
  KitchenOrderStatus,
  KitchenStation,
} from "./kitchen.types.js";
import { validateCreateKitchenOrder, validateCreateStation } from "./kitchen.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface KitchenActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class KitchenService {
  constructor(
    private readonly repo: KitchenRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée un poste de cuisine. */
  async createStation(hotelId: string, input: CreateStationInput, actor: KitchenActor): Promise<KitchenStation> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateStation(input);
    const station = await this.repo.createStation(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "kitchen.station.create", entityType: "KitchenStation", entityId: station.id, after: { name: station.name },
    });
    return station;
  }

  /** Liste les postes. */
  async listStations(hotelId: string, actor: KitchenActor): Promise<KitchenStation[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listStations(hotelId);
  }

  /**
   * Réception d'une commande POS : crée un ordre de préparation sur un poste,
   * avec les lignes de la commande POS source.
   */
  async receiveOrder(hotelId: string, input: CreateKitchenOrderInput, actor: KitchenActor): Promise<KitchenOrder> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateKitchenOrder(input);
    if (!(await this.repo.stationExists(hotelId, v.stationId))) throw new KitchenError("Poste de cuisine introuvable");

    const kitchenRef = await this.repo.nextKitchenRef();
    const order = await this.repo.createOrder(hotelId, { ...v, kitchenRef });

    // Reprendre les lignes de la commande POS
    const posLines = await this.repo.getPosOrderLines(v.posOrderId);
    if (posLines.length > 0) {
      await this.repo.addOrderLines(order.id, posLines);
    }

    await this.repo.logOrderEvent(order.id, "received", actor.actorUserId, `Poste ${v.stationId}`);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "kitchen.order.receive", entityType: "KitchenOrder", entityId: order.id,
      after: { kitchenRef, stationId: v.stationId, status: "NEW", posOrderId: v.posOrderId },
    });
    return order;
  }

  /** Change le statut d'un ordre (cycle New→Served). */
  async transition(hotelId: string, orderId: string, to: KitchenOrderStatus, actor: KitchenActor): Promise<KitchenOrder> {
    this.assertHotel(hotelId, actor);
    const order = await this.repo.getOrder(hotelId, orderId);
    if (!order) throw new KitchenError("Ordre de cuisine introuvable");
    assertKitchenTransition(order.status, to);
    const updated = await this.repo.setOrderStatus(hotelId, orderId, to, actor.actorUserId);
    await this.repo.logOrderEvent(orderId, to.toLowerCase(), actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: `kitchen.order.${to.toLowerCase()}`, entityType: "KitchenOrder", entityId: orderId,
      before: { status: order.status }, after: { status: to },
    });
    return updated;
  }

  /** Annule un ordre de cuisine (avec raison). */
  async cancel(hotelId: string, orderId: string, actor: KitchenActor, reason?: string): Promise<KitchenOrder> {
    const order = await this.transition(hotelId, orderId, "CANCELLED", actor);
    await this.repo.logOrderEvent(orderId, "cancelled", actor.actorUserId, reason);
    return order;
  }

  /** Marque un ordre comme modifié (reste traçable). */
  async markModified(hotelId: string, orderId: string, actor: KitchenActor, note?: string): Promise<KitchenOrder> {
    const order = await this.transition(hotelId, orderId, "MODIFIED", actor);
    await this.repo.logOrderEvent(orderId, "modified", actor.actorUserId, note);
    return order;
  }

  /** Liste les ordres (filtres : poste, statut, priorité). */
  async listOrders(hotelId: string, filter: Omit<KitchenFilter, "hotelId">, actor: KitchenActor): Promise<{ orders: KitchenOrder[]; total: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.listOrders({ hotelId, ...filter });
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: KitchenActor): void {
    if (actor.hotelId !== hotelId) throw new KitchenError("Accès inter-hôtel refusé");
  }
}
