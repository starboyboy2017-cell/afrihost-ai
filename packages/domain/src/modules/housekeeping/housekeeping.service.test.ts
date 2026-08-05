import { describe, it, expect } from "vitest";
import { EventBus, DomainEvents, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { HousekeepingService, type HousekeepingActor } from "./housekeeping.service.js";
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

type StoredTask = HousekeepingTask & { roomStatus: string };

class MemoryRepo implements HousekeepingRepository {
  tasks = new Map<string, StoredTask>();
  events: { taskId: string; action: string; actor?: string; detail?: string }[] = [];
  rooms = new Map<string, string>([["room1", "DIRTY"], ["room2", "AVAILABLE"]]);
  seq = 0;

  async createTask(hotelId: string, input: CreateHousekeepingTaskInput): Promise<HousekeepingTask> {
    const t: StoredTask = {
      id: `hk-${++this.seq}`, hotelId, roomId: input.roomId,
      status: "PENDING", priority: input.priority ?? "MEDIUM",
      assignedTo: input.assignedTo ?? null, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      notes: input.notes ?? null, roomStatus: this.rooms.get(input.roomId) ?? "AVAILABLE",
      createdAt: new Date(), updatedAt: new Date(),
    };
    this.tasks.set(t.id, t);
    return t;
  }
  async getTask(hotelId: string, id: string): Promise<HousekeepingTask | null> {
    const t = this.tasks.get(id);
    return t && t.hotelId === hotelId ? t : null;
  }
  async updateTask(hotelId: string, id: string, input: UpdateHousekeepingTaskInput): Promise<HousekeepingTask> {
    const cur = this.tasks.get(id)!;
    const next = { ...cur, ...input, updatedAt: new Date() } as StoredTask;
    if (input.scheduledAt !== undefined) next.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    this.tasks.set(id, next);
    return next;
  }
  async setStatus(hotelId: string, id: string, status: HousekeepingStatus, changedBy?: string): Promise<HousekeepingTask> {
    const cur = this.tasks.get(id)!;
    const next = { ...cur, status, updatedAt: new Date() } as StoredTask;
    if (status === "IN_PROGRESS") next.startedAt = new Date();
    if (status === "COMPLETED") next.completedAt = new Date();
    if (status === "VERIFIED") next.verifiedAt = new Date();
    this.tasks.set(id, next);
    return next;
  }
  async reassign(hotelId: string, id: string, newAssignee: string): Promise<HousekeepingTask> {
    const cur = this.tasks.get(id)!;
    const next = { ...cur, assignedTo: newAssignee, status: "ASSIGNED" as HousekeepingStatus, updatedAt: new Date() } as StoredTask;
    this.tasks.set(id, next);
    return next;
  }
  async listTasks(filter: HousekeepingFilter): Promise<{ tasks: HousekeepingTask[]; total: number }> {
    let list = [...this.tasks.values()].filter((t) => t.hotelId === filter.hotelId);
    if (filter.status) list = list.filter((t) => t.status === filter.status);
    if (filter.assignedTo) list = list.filter((t) => t.assignedTo === filter.assignedTo);
    if (filter.priority) list = list.filter((t) => t.priority === filter.priority);
    return { tasks: list, total: list.length };
  }
  async roomExists(hotelId: string, roomId: string): Promise<boolean> {
    return hotelId === "h1" && this.rooms.has(roomId);
  }
  async getRoomStatus(hotelId: string, roomId: string): Promise<string | null> {
    return this.rooms.get(roomId) ?? null;
  }
  async logTaskEvent(d: { taskId: string; action: string; actor?: string | null; detail?: string | null }): Promise<void> {
    this.events.push({ taskId: d.taskId, action: d.action, actor: d.actor ?? undefined, detail: d.detail ?? undefined });
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new HousekeepingService(repo, audit, bus);
  const actor: HousekeepingActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 9 — Housekeeping", () => {
  it("crée une tâche PENDING (génération post check-out sur chambre DIRTY)", async () => {
    const { service, actor } = setup();
    const task = await service.createTask("h1", { roomId: "room1" }, actor);
    expect(task.status).toBe("PENDING");
    expect(task.priority).toBe("MEDIUM");
  });

  it("refuse la génération si la chambre n'est pas DIRTY (pas de check-out)", async () => {
    const { service, actor } = setup();
    await expect(service.createTask("h1", { roomId: "room2" }, actor)).rejects.toThrow(/DIRTY/);
  });

  it("affecte à un agent (PENDING → ASSIGNED)", async () => {
    const { service, actor } = setup();
    const task = await service.createTask("h1", { roomId: "room1" }, actor);
    const assigned = await service.assign("h1", task.id, "agent1", actor);
    expect(assigned.status).toBe("ASSIGNED");
    expect(assigned.assignedTo).toBe("agent1");
  });

  it("réaffecte si l'agent n'est pas disponible (ASSIGNED → ASSIGNED, nouvel agent)", async () => {
    const { service, actor } = setup();
    const task = await service.createTask("h1", { roomId: "room1" }, actor);
    await service.assign("h1", task.id, "agent1", actor);
    const reassigned = await service.assign("h1", task.id, "agent2", actor);
    expect(reassigned.assignedTo).toBe("agent2");
  });

  it("déroule le cycle complet et horodate chaque étape", async () => {
    const { service, writer, actor } = setup();
    const task = await service.createTask("h1", { roomId: "room1" }, actor);
    await service.assign("h1", task.id, "agent1", actor);
    const started = await service.start("h1", task.id, actor);
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.startedAt).toBeTruthy();
    const completed = await service.complete("h1", task.id, actor);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeTruthy();
    const verified = await service.verify("h1", task.id, actor);
    expect(verified.status).toBe("VERIFIED");
    expect(verified.verifiedAt).toBeTruthy();
    // Temps de nettoyage mesurable
    expect(completed.completedAt!.getTime() >= started.startedAt!.getTime()).toBe(true);
    expect(writer.entries.some((e) => e.action === "housekeeping.verify")).toBe(true);
  });

  it("rejette une transition illégale (COMPLETED → IN_PROGRESS)", async () => {
    const { service, actor } = setup();
    const task = await service.createTask("h1", { roomId: "room1" }, actor);
    await service.assign("h1", task.id, "agent1", actor);
    await service.start("h1", task.id, actor);
    await service.complete("h1", task.id, actor);
    await expect(service.start("h1", task.id, actor)).rejects.toThrow(/illégale/);
  });

  it("journalise les événements (création, affectation, réaffectation)", async () => {
    const { repo, service, actor } = setup();
    const task = await service.createTask("h1", { roomId: "room1" }, actor);
    await service.assign("h1", task.id, "agent1", actor);
    await service.assign("h1", task.id, "agent2", actor);
    const actions = repo.events.map((e) => e.action);
    expect(actions).toContain("created");
    expect(actions).toContain("assigned");
    expect(actions).toContain("reassigned");
  });

  it("filtre par statut et par agent", async () => {
    const { service, actor } = setup();
    const t1 = await service.createTask("h1", { roomId: "room1" }, actor);
    await service.assign("h1", t1.id, "agent1", actor);
    const byStatus = await service.listTasks("h1", { status: "ASSIGNED" }, actor);
    expect(byStatus.total).toBe(1);
    const byAgent = await service.listTasks("h1", { assignedTo: "agent1" }, actor);
    expect(byAgent.total).toBe(1);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: HousekeepingActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createTask("h1", { roomId: "room1" }, other)).rejects.toThrow(HousekeepingError);
  });

  it("la machine à états autorise PENDING→ASSIGNED→IN_PROGRESS→COMPLETED→VERIFIED", () => {
    expect(() => assertHousekeepingTransition("PENDING", "ASSIGNED")).not.toThrow();
    expect(() => assertHousekeepingTransition("ASSIGNED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertHousekeepingTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
    expect(() => assertHousekeepingTransition("COMPLETED", "VERIFIED")).not.toThrow();
  });
});
