import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { RoomsService, type RoomActor } from "./rooms.service.js";
import { RoomError } from "./rooms.error.js";
import type { RoomsRepository } from "./rooms.repository.js";
import type {
  CreateRoomInput,
  Room,
  RoomFilter,
  RoomStatus,
  RoomStatusEvent,
  UpdateRoomInput,
} from "./rooms.types.js";

type StoredRoom = Room & { history: RoomStatusEvent[] };

class MemoryRepo implements RoomsRepository {
  rooms = new Map<string, StoredRoom>();
  roomTypes = new Set<string>(["rt1", "rt2"]); // types valides pour h1
  seq = 0;

  async createRoom(hotelId: string, input: CreateRoomInput): Promise<Room> {
    const r: StoredRoom = {
      id: `room-${++this.seq}`,
      hotelId,
      roomTypeId: input.roomTypeId,
      number: input.number,
      floor: input.floor ?? null,
      status: input.initialStatus ?? "AVAILABLE",
      keyCardEnabled: input.keyCardEnabled ?? false,
      photos: input.photos ?? [],
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rooms.set(r.id, r);
    return r;
  }
  async updateRoom(hotelId: string, id: string, input: UpdateRoomInput): Promise<Room> {
    const cur = this.rooms.get(id)!;
    const next = { ...cur, ...input, updatedAt: new Date() } as StoredRoom;
    this.rooms.set(id, next);
    return next;
  }
  async setRoomStatus(hotelId: string, id: string, status: RoomStatus, changedBy?: string): Promise<Room> {
    const cur = this.rooms.get(id)!;
    const next = { ...cur, status, updatedAt: new Date() } as StoredRoom;
    next.history.push({ id: `h${next.history.length}`, roomId: id, from: cur.status, to: status, changedBy, createdAt: new Date() });
    this.rooms.set(id, next);
    return next;
  }
  async getRoom(hotelId: string, id: string): Promise<Room | null> {
    const r = this.rooms.get(id);
    return r && r.hotelId === hotelId ? r : null;
  }
  async getRoomByNumber(hotelId: string, number: string): Promise<Room | null> {
    return [...this.rooms.values()].find((r) => r.hotelId === hotelId && r.number === number) ?? null;
  }
  async listRooms(filter: RoomFilter): Promise<{ rooms: Room[]; total: number }> {
    let list = [...this.rooms.values()].filter((r) => r.hotelId === filter.hotelId);
    if (filter.roomTypeId) list = list.filter((r) => r.roomTypeId === filter.roomTypeId);
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    if (filter.floor !== undefined) list = list.filter((r) => r.floor === filter.floor);
    if (filter.search) list = list.filter((r) => r.number.includes(filter.search!));
    return { rooms: list, total: list.length };
  }
  async listRoomStatusHistory(hotelId: string, id: string): Promise<RoomStatusEvent[]> {
    return this.rooms.get(id)?.history ?? [];
  }
  async roomTypeExists(hotelId: string, roomTypeId: string): Promise<boolean> {
    return hotelId === "h1" && this.roomTypes.has(roomTypeId);
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new RoomsService(repo, audit, bus);
  const actor: RoomActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

const base: CreateRoomInput = { roomTypeId: "rt1", number: "101", floor: 1 };

describe("Module 6 — Chambres", () => {
  it("crée une chambre liée à un type, statut initial AVAILABLE", async () => {
    const { service, actor } = setup();
    const room = await service.createRoom("h1", base, actor);
    expect(room.number).toBe("101");
    expect(room.roomTypeId).toBe("rt1");
    expect(room.status).toBe("AVAILABLE");
  });

  it("refuse une chambre avec un numéro en double", async () => {
    const { service, actor } = setup();
    await service.createRoom("h1", base, actor);
    await expect(service.createRoom("h1", { ...base, roomTypeId: "rt2" }, actor)).rejects.toThrow(/numéro/);
  });

  it("refuse un type de chambre d'un autre hôtel (isolation)", async () => {
    const { service, actor } = setup();
    // roomTypeId "rt1" n'existe que pour h1 ; mais ici on simule un type h2
    const repo = new MemoryRepo();
    repo.roomTypes = new Set(["rt-h2"]);
    const other: RoomActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    const svc = new RoomsService(repo, new AuditLogger(new InMemoryAuditWriter()), new EventBus());
    await expect(svc.createRoom("h2", { roomTypeId: "rt-h2", number: "1" }, other)).rejects.toThrow();
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: RoomActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createRoom("h1", base, other)).rejects.toThrow(RoomError);
  });

  it("change l'état via la machine à états et journalise l'historique", async () => {
    const { service, writer, actor } = setup();
    const room = await service.createRoom("h1", base, actor);
    await service.changeStatus("h1", room.id, "RESERVED", actor);
    const occupied = await service.changeStatus("h1", room.id, "OCCUPIED", actor);
    expect(occupied.status).toBe("OCCUPIED");
    const history = await service.history("h1", room.id, actor);
    expect(history.length).toBe(2);
    expect(writer.entries.some((e) => e.action === "roomStatus.update")).toBe(true);
  });

  it("rejette une transition d'état illégale", async () => {
    const { service, actor } = setup();
    const room = await service.createRoom("h1", base, actor);
    // AVAILABLE → OCCUPIED est illégal (passe par RESERVED)
    await expect(service.changeStatus("h1", room.id, "OCCUPIED", actor)).rejects.toThrow(/illégale/);
  });

  it("met hors service et remet en service", async () => {
    const { service, actor } = setup();
    const room = await service.createRoom("h1", base, actor);
    const ooo = await service.markOutOfOrder("h1", room.id, actor, "Maintenance");
    expect(ooo.status).toBe("OUT_OF_ORDER");
    expect(service.isUnavailable(ooo.status)).toBe(true);
    const avail = await service.markAvailable("h1", room.id, actor);
    expect(avail.status).toBe("AVAILABLE");
  });

  it("liste et filtre par type/état/étage", async () => {
    const { service, actor } = setup();
    await service.createRoom("h1", { roomTypeId: "rt1", number: "101", floor: 1 }, actor);
    await service.createRoom("h1", { roomTypeId: "rt2", number: "201", floor: 2 }, actor);
    const all = await service.listRooms("h1", {}, actor);
    expect(all.total).toBe(2);
    const floor1 = await service.listRooms("h1", { floor: 1 }, actor);
    expect(floor1.total).toBe(1);
    const byType = await service.listRooms("h1", { roomTypeId: "rt1" }, actor);
    expect(byType.total).toBe(1);
  });
});
