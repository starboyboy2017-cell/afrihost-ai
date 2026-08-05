import { describe, it, expect } from "vitest";
import { EventBus, DomainEvents, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { StayService, type StayActor } from "./stay.service.js";
import { StayError } from "./stay.error.js";
import type { StayRepository } from "./stay.repository.js";
import type { RoomAssignment, Stay, StayDetail } from "./stay.types.js";

interface ReservationRow {
  id: string; status: string; guestId: string | null; roomId: string | null;
  bookingRef: string; arrivalDate: Date; departureDate: Date;
}
interface RoomRow { id: string; status: string; number: string; roomTypeId: string }

class MemoryRepo implements StayRepository {
  reservations = new Map<string, ReservationRow>();
  rooms = new Map<string, RoomRow>();
  stays = new Map<string, Stay>();
  assignments: RoomAssignment[] = [];
  seq = 0;

  constructor() {
    // Réservation CONFIRMED avec chambre RESERVED (room 101)
    this.reservations.set("r1", { id: "r1", status: "CONFIRMED", guestId: "g1", roomId: "room1", bookingRef: "AH-2026-00001", arrivalDate: new Date("2026-08-01"), departureDate: new Date("2026-08-05") });
    this.rooms.set("room1", { id: "room1", status: "RESERVED", number: "101", roomTypeId: "rt1" });
    this.rooms.set("room2", { id: "room2", status: "AVAILABLE", number: "102", roomTypeId: "rt1" });
  }

  async getReservation(hotelId: string, id: string) {
    const r = this.reservations.get(id);
    return r ? { ...r } : null;
  }
  async setReservationStatus(hotelId: string, id: string, status: string, changedBy?: string) {
    const r = this.reservations.get(id)!;
    this.reservations.set(id, { ...r, status });
  }
  async updateReservationDeparture(hotelId: string, id: string, departureDate: Date) {
    const r = this.reservations.get(id)!;
    this.reservations.set(id, { ...r, departureDate });
  }
  async updateReservationRoom(hotelId: string, id: string, roomId: string | null) {
    const r = this.reservations.get(id)!;
    this.reservations.set(id, { ...r, roomId });
  }
  async getRoom(hotelId: string, id: string) {
    const r = this.rooms.get(id);
    return r ? { ...r } : null;
  }
  async setRoomStatus(hotelId: string, id: string, status: string, changedBy?: string) {
    const r = this.rooms.get(id)!;
    this.rooms.set(id, { ...r, status });
  }
  async createStay(d: { hotelId: string; reservationId: string; guestId: string | null; roomId: string; departureDate: Date }): Promise<Stay> {
    const s: Stay = { id: `stay-${++this.seq}`, hotelId: d.hotelId, reservationId: d.reservationId, guestId: d.guestId, roomId: d.roomId, status: "ACTIVE", checkInAt: new Date(), departureDate: d.departureDate };
    this.stays.set(s.id, s);
    return s;
  }
  async getStayByReservation(hotelId: string, reservationId: string) {
    return [...this.stays.values()].find((s) => s.hotelId === hotelId && s.reservationId === reservationId) ?? null;
  }
  async updateStay(hotelId: string, id: string, d: Partial<Pick<Stay, "roomId" | "status" | "checkOutAt" | "departureDate" | "notes">>): Promise<Stay> {
    const cur = this.stays.get(id)!;
    const next = { ...cur, ...d, updatedAt: new Date() } as Stay;
    this.stays.set(id, next);
    return next;
  }
  async listActiveStays(hotelId: string): Promise<StayDetail[]> {
    return [...this.stays.values()]
      .filter((s) => s.hotelId === hotelId && s.status === "ACTIVE")
      .map((s) => {
        const r = this.reservations.get(s.reservationId);
        const rm = s.roomId ? this.rooms.get(s.roomId) : null;
        return { stay: s, bookingRef: r?.bookingRef ?? "", roomNumber: rm?.number ?? null, reservationStatus: r?.status ?? "" };
      });
  }
  async listRoomAssignments(hotelId: string, reservationId: string): Promise<RoomAssignment[]> {
    const stay = [...this.stays.values()].find((s) => s.reservationId === reservationId);
    return this.assignments.filter((a) => a.stayId === stay?.id);
  }
  async addRoomAssignment(d: { stayId: string; roomId: string; reason?: string | null; changedBy?: string }): Promise<void> {
    this.assignments.push({ id: `a${this.assignments.length}`, stayId: d.stayId, roomId: d.roomId, reason: d.reason ?? null, changedBy: d.changedBy });
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new StayService(repo, audit, bus);
  const actor: StayActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 7 — Check-in / Check-out", () => {
  it("check-in : occupe la chambre, active le séjour, émet l'événement", async () => {
    const { repo, bus, service, actor } = setup();
    let checkedIn = 0;
    bus.subscribe(DomainEvents.guestCheckedIn, () => { checkedIn++; });
    const stay = await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    expect(stay.status).toBe("ACTIVE");
    expect(stay.roomId).toBe("room1");
    expect(repo.rooms.get("room1")!.status).toBe("OCCUPIED");
    expect(repo.reservations.get("r1")!.status).toBe("CHECKED_IN");
    expect(checkedIn).toBe(1);
  });

  it("check-in : refuse si la réservation n'est pas CONFIRMED", async () => {
    const { repo, service, actor } = setup();
    repo.reservations.set("r1", { ...repo.reservations.get("r1")!, status: "PROVISIONAL" });
    await expect(service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor)).rejects.toThrow(StayError);
  });

  it("check-in : refuse un double check-in", async () => {
    const { service, actor } = setup();
    await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    await expect(service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor)).rejects.toThrow(/déjà en cours/);
  });

  it("check-out : libère la chambre (→ DIRTY), clôture le séjour", async () => {
    const { repo, service, actor } = setup();
    await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    const stay = await service.checkOut("h1", { reservationId: "r1" }, actor);
    expect(stay.status).toBe("CHECKED_OUT");
    expect(repo.rooms.get("room1")!.status).toBe("DIRTY");
    expect(repo.reservations.get("r1")!.status).toBe("CHECKED_OUT");
  });

  it("check-out : refuse sans check-in", async () => {
    const { service, actor } = setup();
    await expect(service.checkOut("h1", { reservationId: "r1" }, actor)).rejects.toThrow(/Check-out impossible/);
  });

  it("prolongation : repousse la date de départ", async () => {
    const { repo, service, actor } = setup();
    await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    const newDep = new Date("2026-08-08");
    const stay = await service.extendStay("h1", { reservationId: "r1", newDepartureDate: "2026-08-08" }, actor);
    expect(stay.departureDate.getTime()).toBe(newDep.getTime());
    expect(repo.reservations.get("r1")!.departureDate.getTime()).toBe(newDep.getTime());
  });

  it("prolongation : refuse si la nouvelle date n'est pas postérieure", async () => {
    const { service, actor } = setup();
    await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    await expect(service.extendStay("h1", { reservationId: "r1", newDepartureDate: "2026-08-01" }, actor)).rejects.toThrow(/postérieure/);
  });

  it("changement de chambre : libère l'ancienne, occupe la nouvelle, trace", async () => {
    const { repo, service, actor } = setup();
    await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    const stay = await service.changeRoom("h1", { reservationId: "r1", newRoomId: "room2", reason: "Client demande" }, actor);
    expect(stay.roomId).toBe("room2");
    expect(repo.rooms.get("room1")!.status).toBe("DIRTY");
    expect(repo.rooms.get("room2")!.status).toBe("OCCUPIED");
    const assigns = await service.roomAssignments("h1", "r1", actor);
    expect(assigns.length).toBe(1);
    expect(assigns[0]!.roomId).toBe("room2");
  });

  it("liste les séjours actifs (pour le tableau de disponibilité)", async () => {
    const { service, actor } = setup();
    await service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, actor);
    const active = await service.listActive("h1", actor);
    expect(active.length).toBe(1);
    expect(active[0]!.bookingRef).toBe("AH-2026-00001");
    expect(active[0]!.roomNumber).toBe("101");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: StayActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.checkIn("h1", { reservationId: "r1", roomId: "room1" }, other)).rejects.toThrow(StayError);
  });
});
