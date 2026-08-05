/**
 * Module 11 — Blanchisserie : service métier.
 *
 * Fonctionnalités :
 *   - types de linge par hôtel ;
 *   - pièces de linge avec **cycle complet** (CLEAN → DISTRIBUTED → USED → DIRTY →
 *     WASHING → DRYING → IRONING → CLEAN) via machine à états ;
 *   - **lots de lavage** (dates, quantité, responsable, coût, mode interne/externe) ;
 *   - **pertes / détériorations** ;
 *   - **alertes de seuils de stock** (via le comptage par type).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC laundry.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { LaundryError } from "./laundry.error.js";
import { assertLaundryTransition } from "./laundry.state.js";
import type { LaundryRepository } from "./laundry.repository.js";
import type {
  CreateBatchInput,
  CreateItemInput,
  CreateItemTypeInput,
  CreateLossInput,
  LaundryBatch,
  LaundryFilter,
  LaundryItem,
  LaundryItemType,
  LaundryLoss,
  LaundryState,
} from "./laundry.types.js";
import { validateCreateBatch, validateCreateItem, validateCreateItemType, validateCreateLoss } from "./laundry.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface LaundryActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class LaundryService {
  constructor(
    private readonly repo: LaundryRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée un type de linge. */
  async createItemType(hotelId: string, input: CreateItemTypeInput, actor: LaundryActor): Promise<LaundryItemType> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateItemType(input);
    const type = await this.repo.createItemType(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "laundry.item_type.create", entityType: "LaundryItemType", entityId: type.id, after: { name: type.name },
    });
    return type;
  }

  /** Ajoute une pièce de linge (état CLEAN). */
  async addItem(hotelId: string, input: CreateItemInput, actor: LaundryActor): Promise<LaundryItem> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateItem(input);
    if (!(await this.repo.itemTypeExists(hotelId, v.itemTypeId))) {
      throw new LaundryError("Type de linge introuvable dans cet hôtel");
    }
    const item = await this.repo.createItem(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "laundry.item.create", entityType: "LaundryItem", entityId: item.id, after: { state: "CLEAN" },
    });
    return item;
  }

  /** Change l'état d'une pièce (cycle de vie). */
  async changeState(hotelId: string, itemId: string, to: LaundryState, actor: LaundryActor, roomId?: string | null): Promise<LaundryItem> {
    this.assertHotel(hotelId, actor);
    const item = await this.repo.getItem(hotelId, itemId);
    if (!item) throw new LaundryError("Pièce de linge introuvable");
    assertLaundryTransition(item.state, to);
    const updated = await this.repo.setItemState(hotelId, itemId, to, roomId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "laundry.item.state_change", entityType: "LaundryItem", entityId: itemId,
      before: { state: item.state }, after: { state: to },
    });
    return updated;
  }

  /** Distribue du linge propre à une chambre (CLEAN → DISTRIBUTED). */
  async distribute(hotelId: string, itemId: string, roomId: string, actor: LaundryActor): Promise<LaundryItem> {
    return this.changeState(hotelId, itemId, "DISTRIBUTED", actor, roomId);
  }

  /** Crée un lot de lavage à partir de pièces DIRTY. */
  async createBatch(hotelId: string, input: CreateBatchInput, actor: LaundryActor): Promise<LaundryBatch> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateBatch(input);
    const batch = await this.repo.createBatch(hotelId, v);
    // Les pièces du lot passent en WASHING
    if (v.itemIds && v.itemIds.length > 0) {
      await this.repo.setItemsState(v.itemIds, "WASHING");
    }
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "laundry.batch.create", entityType: "LaundryBatch", entityId: batch.id,
      after: { mode: batch.mode, cost: batch.cost },
    });
    return batch;
  }

  /** Termine un lot → les pièces passent en CLEAN (cycle lavage terminé). */
  async completeBatch(hotelId: string, batchId: string, actor: LaundryActor): Promise<LaundryBatch> {
    this.assertHotel(hotelId, actor);
    const batch = await this.repo.completeBatch(hotelId, batchId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "laundry.batch.complete", entityType: "LaundryBatch", entityId: batchId,
      after: { completedAt: batch.completedAt },
    });
    return batch;
  }

  /** Enregistre une perte / détérioration. */
  async registerLoss(hotelId: string, input: CreateLossInput, actor: LaundryActor): Promise<LaundryLoss> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateLoss(input);
    if (!(await this.repo.getItem(hotelId, v.itemId))) {
      throw new LaundryError("Pièce de linge introuvable");
    }
    const loss = await this.repo.createLoss(hotelId, v);
    // La pièce est retirée du stock (soft-delete)
    await this.repo.softDeleteItem(hotelId, v.itemId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "laundry.loss.create", entityType: "LaundryLoss", entityId: loss.id,
      after: { reason: v.reason, itemId: v.itemId },
    });
    return loss;
  }

  /** Stock par type (pour alertes de seuil). */
  async getStock(hotelId: string, actor: LaundryActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.getStock(hotelId);
  }

  /** Liste les pièces avec filtres. */
  async listItems(hotelId: string, filter: Omit<LaundryFilter, "hotelId">, actor: LaundryActor): Promise<{ items: LaundryItem[]; total: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.listItems({ hotelId, ...filter });
  }

  /** Liste les lots. */
  async listBatches(hotelId: string, actor: LaundryActor): Promise<LaundryBatch[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listBatches(hotelId);
  }

  /** Liste les types. */
  async listItemTypes(hotelId: string, actor: LaundryActor): Promise<LaundryItemType[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listItemTypes(hotelId);
  }

  /** Liste les pertes/détériorations. */
  async listLosses(hotelId: string, actor: LaundryActor): Promise<LaundryLoss[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listLosses(hotelId);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: LaundryActor): void {
    if (actor.hotelId !== hotelId) throw new LaundryError("Accès inter-hôtel refusé");
  }
}
