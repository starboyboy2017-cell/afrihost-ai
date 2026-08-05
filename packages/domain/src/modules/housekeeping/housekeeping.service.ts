/**
 * Module 9 — Housekeeping : service métier.
 *
 * Fonctionnalités (BusinessRules BR-7) :
 *   - **génération automatique** d'une tâche de ménage quand une chambre passe
 *     DIRTY (au check-out) — sinon création manuelle ;
 *   - **affectation** au personnel avec **priorité** ;
 *   - **cycle de statut** : PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED ;
 *   - **réaffectation** si l'agent n'est pas disponible (ASSIGNED → ASSIGNED) ;
 *   - **horodatage de chaque étape** (création, début, fin, validation) → mesure
 *     des temps de nettoyage ;
 *   - **journal d'audit** des changements et affectations + **événements temps réel**.
 *
 * Isolation multihôtel : chaque opération exige un acteur dont hotelId correspond.
 * RBAC housekeeping.* au niveau des routes. La chambre doit appartenir à l'hôtel.
 */

import { DomainEvents, type AuditTrail, type EventBus } from "@afrihost/core";
import { HousekeepingError } from "./housekeeping.error.js";
import { assertHousekeepingTransition } from "./housekeeping.state.js";
import type { HousekeepingRepository } from "./housekeeping.repository.js";
import type {
  CreateHousekeepingTaskInput,
  HousekeepingFilter,
  HousekeepingStatus,
  HousekeepingTask,
  UpdateHousekeepingTaskInput,
} from "./housekeeping.types.js";
import { validateCreateTask, validateStatus, validateUpdateTask } from "./housekeeping.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface HousekeepingActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class HousekeepingService {
  constructor(
    private readonly repo: HousekeepingRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /**
   * Génère une tâche de ménage (appelé automatiquement au check-out quand la
   * chambre passe DIRTY, ou manuellement).
   */
  async createTask(hotelId: string, input: CreateHousekeepingTaskInput, actor: HousekeepingActor): Promise<HousekeepingTask> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateTask(input);

    if (!(await this.repo.roomExists(hotelId, v.roomId))) {
      throw new HousekeepingError("Chambre introuvable dans cet hôtel");
    }
    // Génération auto : vérifier que la chambre est bien DIRTY (post check-out)
    const roomStatus = await this.repo.getRoomStatus(hotelId, v.roomId);
    if (roomStatus !== "DIRTY" && !v.assignedTo) {
      // Création manuelle autorisée même si la chambre n'est pas DIRTY, mais on prévient
      // via la logique : on exige DIRTY pour la génération auto du check-out.
      throw new HousekeepingError("La chambre doit être en état DIRTY pour générer une tâche de ménage");
    }

    const task = await this.repo.createTask(hotelId, v);
    await this.repo.logTaskEvent({ taskId: task.id, action: "created", actor: actor.actorUserId });

    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "housekeeping.create",
      entityType: "HousekeepingTask",
      entityId: task.id,
      after: { roomId: task.roomId, priority: task.priority, status: task.status },
    });
    await this.bus.publish({
      name: DomainEvents.housekeepingTaskCreated,
      hotelId,
      organisationId: actor.organisationId,
      data: { taskId: task.id, roomId: task.roomId, priority: task.priority },
    });
    return task;
  }

  /** Affecte (ou réaffecte) la tâche à un agent. */
  async assign(hotelId: string, taskId: string, assigneeId: string, actor: HousekeepingActor): Promise<HousekeepingTask> {
    this.assertHotel(hotelId, actor);
    const task = await this.repo.getTask(hotelId, taskId);
    if (!task) throw new HousekeepingError("Tâche introuvable");
    // De PENDING ou ASSIGNED vers ASSIGNED (réaffectation)
    assertHousekeepingTransition(task.status, "ASSIGNED");
    const updated = await this.repo.reassign(hotelId, taskId, assigneeId);
    await this.repo.logTaskEvent({ taskId, action: task.assignedTo ? "reassigned" : "assigned", actor: actor.actorUserId, detail: assigneeId });
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: task.assignedTo ? "housekeeping.reassign" : "housekeeping.assign",
      entityType: "HousekeepingTask",
      entityId: taskId,
      before: { assignedTo: task.assignedTo },
      after: { assignedTo: assigneeId, status: "ASSIGNED" },
    });
    return updated;
  }

  /** Démarre le nettoyage (IN_PROGRESS + horodatage). */
  async start(hotelId: string, taskId: string, actor: HousekeepingActor): Promise<HousekeepingTask> {
    this.assertHotel(hotelId, actor);
    const task = await this.repo.getTask(hotelId, taskId);
    if (!task) throw new HousekeepingError("Tâche introuvable");
    assertHousekeepingTransition(task.status, "IN_PROGRESS");
    const updated = await this.repo.setStatus(hotelId, taskId, "IN_PROGRESS", actor.actorUserId);
    await this.repo.logTaskEvent({ taskId, action: "started", actor: actor.actorUserId });
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "housekeeping.start",
      entityType: "HousekeepingTask",
      entityId: taskId,
      after: { status: "IN_PROGRESS", startedAt: updated.startedAt },
    });
    return updated;
  }

  /** Termine le nettoyage (COMPLETED + horodatage). */
  async complete(hotelId: string, taskId: string, actor: HousekeepingActor): Promise<HousekeepingTask> {
    this.assertHotel(hotelId, actor);
    const task = await this.repo.getTask(hotelId, taskId);
    if (!task) throw new HousekeepingError("Tâche introuvable");
    assertHousekeepingTransition(task.status, "COMPLETED");
    const updated = await this.repo.setStatus(hotelId, taskId, "COMPLETED", actor.actorUserId);
    await this.repo.logTaskEvent({ taskId, action: "completed", actor: actor.actorUserId });
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "housekeeping.complete",
      entityType: "HousekeepingTask",
      entityId: taskId,
      after: { status: "COMPLETED", completedAt: updated.completedAt },
    });
    return updated;
  }

  /** Valide le ménage (VERIFIED + horodatage) — la chambre redevient disponible. */
  async verify(hotelId: string, taskId: string, actor: HousekeepingActor): Promise<HousekeepingTask> {
    this.assertHotel(hotelId, actor);
    const task = await this.repo.getTask(hotelId, taskId);
    if (!task) throw new HousekeepingError("Tâche introuvable");
    assertHousekeepingTransition(task.status, "VERIFIED");
    const updated = await this.repo.setStatus(hotelId, taskId, "VERIFIED", actor.actorUserId);
    await this.repo.logTaskEvent({ taskId, action: "verified", actor: actor.actorUserId });
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "housekeeping.verify",
      entityType: "HousekeepingTask",
      entityId: taskId,
      after: { status: "VERIFIED", verifiedAt: updated.verifiedAt },
    });
    await this.bus.publish({
      name: DomainEvents.housekeepingCompleted,
      hotelId,
      organisationId: actor.organisationId,
      data: { taskId, roomId: task.roomId },
    });
    return updated;
  }

  /** Modifie une tâche (priorité, planification, notes). */
  async updateTask(hotelId: string, taskId: string, input: UpdateHousekeepingTaskInput, actor: HousekeepingActor): Promise<HousekeepingTask> {
    this.assertHotel(hotelId, actor);
    const v = validateUpdateTask(input);
    const task = await this.repo.getTask(hotelId, taskId);
    if (!task) throw new HousekeepingError("Tâche introuvable");
    const updated = await this.repo.updateTask(hotelId, taskId, v);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId,
      actorUserId: actor.actorUserId,
      action: "housekeeping.update",
      entityType: "HousekeepingTask",
      entityId: taskId,
      before: { priority: task.priority },
      after: { priority: updated.priority },
    });
    return updated;
  }

  /** Liste les tâches avec filtres. */
  async listTasks(hotelId: string, filter: Omit<HousekeepingFilter, "hotelId">, actor: HousekeepingActor): Promise<{ tasks: HousekeepingTask[]; total: number }> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTasks({ hotelId, ...filter });
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: HousekeepingActor): void {
    if (actor.hotelId !== hotelId) throw new HousekeepingError("Accès inter-hôtel refusé");
  }
}
