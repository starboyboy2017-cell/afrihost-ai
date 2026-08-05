import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { MaintenanceService, type MaintenanceActor } from "./maintenance.service.js";
import { MaintenanceError } from "./maintenance.error.js";
import { assertMaintenanceTransition } from "./maintenance.state.js";
import type { MaintenanceRepository } from "./maintenance.repository.js";
import type {
  CreateMaintenanceInput,
  MaintenanceFilter,
  MaintenanceRequest,
  MaintenanceStatus,
  UpdateMaintenanceInput,
} from "./maintenance.types.js";

type StoredReq = MaintenanceRequest & { events: string[] };

class MemoryRepo implements MaintenanceRepository {
  requests = new Map<string, StoredReq>();
  rooms = new Set<string>(["room1", "room2"]);
  roomStatuses = new Map<string, string>([["room1", "AVAILABLE"], ["room2", "AVAILABLE"]]);
  seq = 0;

  async createRequest(hotelId: string, input: CreateMaintenanceInput): Promise<MaintenanceRequest> {
    const r: StoredReq = {
      id: `mt-${++this.seq}`, hotelId, roomId: input.roomId ?? null,
      title: input.title, description: input.description ?? null,
      status: "OPEN", priority: input.priority ?? "MEDIUM",
      assignedTo: input.assignedTo ?? null,
      putRoomOutOfOrder: input.putRoomOutOfOrder ?? false, roomRestored: false,
      events: [], createdAt: new Date(), updatedAt: new Date(),
    };
    this.requests.set(r.id, r);
    return r;
  }
  async getRequest(hotelId: string, id: string): Promise<MaintenanceRequest | null> {
    const r = this.requests.get(id);
    return r && r.hotelId === hotelId ? r : null;
  }
  async updateRequest(hotelId: string, id: string, input: UpdateMaintenanceInput): Promise<MaintenanceRequest> {
    const cur = this.requests.get(id)!;
    const next = { ...cur, ...input, updatedAt: new Date() } as StoredReq;
    this.requests.set(id, next);
    return next;
  }
  async setStatus(hotelId: string, id: string, status: MaintenanceStatus, actor?: string): Promise<MaintenanceRequest> {
    const cur = this.requests.get(id)!;
    const next = { ...cur, status, updatedAt: new Date() } as StoredReq;
    if (status === "IN_PROGRESS") next.startedAt = new Date();
    if (status === "RESOLVED") next.resolvedAt = new Date();
    if (status === "CLOSED") next.closedAt = new Date();
    if (status === "RESOLVED" || status === "CLOSED") next.roomRestored = true;
    this.requests.set(id, next);
    return next;
  }
  async assign(hotelId: string, id: string, assignee: string): Promise<MaintenanceRequest> {
    const cur = this.requests.get(id)!;
    const next = { ...cur, assignedTo: assignee, status: "ASSIGNED" as MaintenanceStatus, updatedAt: new Date() } as StoredReq;
    this.requests.set(id, next);
    return next;
  }
  async listRequests(filter: MaintenanceFilter): Promise<{ requests: MaintenanceRequest[]; total: number }> {
    let list = [...this.requests.values()].filter((r) => r.hotelId === filter.hotelId);
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    if (filter.roomId) list = list.filter((r) => r.roomId === filter.roomId);
    if (filter.priority) list = list.filter((r) => r.priority === filter.priority);
    return { requests: list, total: list.length };
  }
  async roomExists(hotelId: string, roomId: string): Promise<boolean> {
    return hotelId === "h1" && this.rooms.has(roomId);
  }
  async setRoomStatus(hotelId: string, roomId: string, status: "OUT_OF_ORDER" | "AVAILABLE"): Promise<void> {
    this.roomStatuses.set(roomId, status);
  }
  async logRequestEvent(d: { requestId: string; action: string; actor?: string | null; detail?: string | null }): Promise<void> {
    const r = this.requests.get(d.requestId);
    if (r) r.events.push(d.action);
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new MaintenanceService(repo, audit, bus);
  const actor: MaintenanceActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 10 — Maintenance & interventions", () => {
  it("crée un ticket OPEN lié à une chambre", async () => {
    const { service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "Climatisation en panne" }, actor);
    expect(req.status).toBe("OPEN");
    expect(req.roomId).toBe("room1");
    expect(req.priority).toBe("MEDIUM");
  });

  it("met la chambre hors service si demandé", async () => {
    const { repo, service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "Fuite d'eau", putRoomOutOfOrder: true }, actor);
    expect(req.putRoomOutOfOrder).toBe(true);
    expect(repo.roomStatuses.get("room1")).toBe("OUT_OF_ORDER");
  });

  it("refuse un ticket sur une chambre d'un autre hôtel", async () => {
    const { service, actor } = setup();
    await expect(service.createRequest("h1", { roomId: "roomX", title: "X" }, actor)).rejects.toThrow(/introuvable/);
  });

  it("affecte puis réaffecte un ticket (OPEN→ASSIGNED, puis nouvel agent)", async () => {
    const { service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "Lumière" }, actor);
    const a = await service.assign("h1", req.id, "tech1", actor);
    expect(a.status).toBe("ASSIGNED");
    expect(a.assignedTo).toBe("tech1");
    const b = await service.assign("h1", req.id, "tech2", actor);
    expect(b.assignedTo).toBe("tech2");
  });

  it("déroule le cycle complet et remet la chambre en service à la clôture", async () => {
    const { repo, service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "Fuite", putRoomOutOfOrder: true }, actor);
    expect(repo.roomStatuses.get("room1")).toBe("OUT_OF_ORDER");
    await service.assign("h1", req.id, "tech1", actor);
    await service.transition("h1", req.id, "IN_PROGRESS", actor);
    const onHold = await service.transition("h1", req.id, "ON_HOLD", actor);
    expect(onHold.status).toBe("ON_HOLD");
    await service.transition("h1", req.id, "RESOLVED", actor);
    const closed = await service.transition("h1", req.id, "CLOSED", actor);
    expect(closed.status).toBe("CLOSED");
    // Chambre remise en service (réservable)
    expect(repo.roomStatuses.get("room1")).toBe("AVAILABLE");
  });

  it("rejette une transition illégale (RESOLVED→OPEN impossible)", async () => {
    const { service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "X" }, actor);
    await service.assign("h1", req.id, "tech1", actor);
    await service.transition("h1", req.id, "IN_PROGRESS", actor);
    await service.transition("h1", req.id, "RESOLVED", actor);
    // RESOLVED → OPEN est illégal (retour en arrière non autorisé)
    await expect(service.transition("h1", req.id, "OPEN", actor)).rejects.toThrow(/illégale/);
  });

  it("journalise les événements (création, affectation, changement)", async () => {
    const { repo, service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "X", putRoomOutOfOrder: true }, actor);
    await service.assign("h1", req.id, "tech1", actor);
    await service.transition("h1", req.id, "IN_PROGRESS", actor);
    const events = repo.requests.get(req.id)!.events;
    expect(events).toContain("created");
    expect(events).toContain("assigned");
    expect(events).toContain("room_out_of_order");
    expect(events).toContain("status_in_progress");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: MaintenanceActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createRequest("h1", { roomId: "room1", title: "X" }, other)).rejects.toThrow(MaintenanceError);
  });

  it("la machine à états autorise le cycle complet", () => {
    expect(() => assertMaintenanceTransition("OPEN", "ASSIGNED")).not.toThrow();
    expect(() => assertMaintenanceTransition("ASSIGNED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertMaintenanceTransition("IN_PROGRESS", "ON_HOLD")).not.toThrow();
    expect(() => assertMaintenanceTransition("ON_HOLD", "RESOLVED")).not.toThrow();
    expect(() => assertMaintenanceTransition("RESOLVED", "CLOSED")).not.toThrow();
  });

  it("filtre par statut", async () => {
    const { service, actor } = setup();
    const req = await service.createRequest("h1", { roomId: "room1", title: "X" }, actor);
    await service.assign("h1", req.id, "tech1", actor);
    const open = await service.listRequests("h1", { status: "OPEN" }, actor);
    expect(open.total).toBe(0);
    const assigned = await service.listRequests("h1", { status: "ASSIGNED" }, actor);
    expect(assigned.total).toBe(1);
  });
});
