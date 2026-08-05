import { describe, it, expect } from "vitest";
import { EventBus, DomainEvents, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { ReservationsService, type ReservationActor } from "./reservations.service.js";
import { ReservationError } from "./reservations.error.js";
import type { ReservationsRepository, ReservationFilter } from "./reservations.repository.js";
import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
  ReservationStatusEvent,
  UpdateReservationInput,
} from "./reservations.types.js";

type StoredReservation = Reservation & {
  __statusHistory: ReservationStatusEvent[];
  __baseRate: number;
  __vatRate: number;
};

class MemoryRepo implements ReservationsRepository {
  reservations = new Map<string, StoredReservation>();
  seq = 0;
  private roomOverlaps: { roomId: string; arrival: Date; departure: Date; reservationId: string }[] = [];

  private make(
    hotelId: string,
    input: CreateReservationInput & { bookingRef: string; status: ReservationStatus; amount: number; taxAmount: number; discountAmount: number; currency: string },
  ): StoredReservation {
    return {
      id: `res-${++this.seq}`,
      hotelId,
      guestId: input.guestId ?? null,
      roomId: input.roomId ?? null,
      roomTypeId: input.roomTypeId ?? null,
      bookingRef: input.bookingRef,
      source: input.source,
      status: input.status,
      arrivalDate: input.arrivalDate as Date,
      departureDate: input.departureDate as Date,
      adults: input.adults ?? 1,
      children: input.children ?? 0,
      amount: input.amount,
      taxAmount: input.taxAmount,
      discountAmount: input.discountAmount,
      currency: input.currency,
      createdAt: new Date(),
      updatedAt: new Date(),
      __statusHistory: [],
      __baseRate: input.baseRate ?? 0,
      __vatRate: 0.18,
    };
  }

  async createReservation(hotelId: string, input: Parameters<ReservationsRepository["createReservation"]>[1]): Promise<Reservation> {
    const r = this.make(hotelId, input);
    if (input.roomId) {
      this.roomOverlaps.push({ roomId: input.roomId, arrival: r.arrivalDate, departure: r.departureDate, reservationId: r.id });
    }
    this.reservations.set(r.id, r);
    return r;
  }
  async updateReservation(hotelId: string, id: string, input: UpdateReservationInput): Promise<Reservation> {
    const cur = this.reservations.get(id)!;
    const next = { ...cur, ...input, updatedAt: new Date() } as StoredReservation;
    this.reservations.set(id, next);
    return next;
  }
  async setStatus(_hotelId: string, id: string, status: ReservationStatus, changedBy?: string): Promise<Reservation> {
    const cur = this.reservations.get(id)!;
    const next = { ...cur, status, updatedAt: new Date() } as StoredReservation;
    next.__statusHistory.push({ id: `h${next.__statusHistory.length}`, reservationId: id, from: cur.status, to: status, changedBy, createdAt: new Date() });
    this.reservations.set(id, next);
    return next;
  }
  async getReservation(hotelId: string, id: string): Promise<Reservation | null> {
    const r = this.reservations.get(id);
    return r && r.hotelId === hotelId ? r : null;
  }
  async getReservationByRef(hotelId: string, ref: string): Promise<Reservation | null> {
    return [...this.reservations.values()].find((r) => r.hotelId === hotelId && r.bookingRef === ref) ?? null;
  }
  async listReservations(filter: ReservationFilter): Promise<Reservation[]> {
    return [...this.reservations.values()].filter((r) => {
      if (r.hotelId !== filter.hotelId) return false;
      if (filter.status && r.status !== filter.status) return false;
      if (filter.guestId && r.guestId !== filter.guestId) return false;
      if (filter.from && r.arrivalDate < filter.from) return false;
      if (filter.to && r.arrivalDate > filter.to) return false;
      return true;
    });
  }
  async hasOverlap(hotelId: string, roomId: string, arrival: Date, departure: Date, excludeId?: string): Promise<boolean> {
    return this.roomOverlaps.some(
      (o) =>
        o.roomId === roomId &&
        o.reservationId !== excludeId &&
        arrival.getTime() < o.departure.getTime() &&
        departure.getTime() > o.arrival.getTime(),
    );
  }
  async getRoomTypeBaseRate(hotelId: string, roomTypeId: string): Promise<number | null> {
    return roomTypeId === "rt1" ? 5000 : null;
  }
  async getHotelVatRate(): Promise<number> {
    return 0.18;
  }
  async listStatusHistory(hotelId: string, id: string): Promise<ReservationStatusEvent[]> {
    return this.reservations.get(id)?.__statusHistory ?? [];
  }
  async nextBookingRef(): Promise<string> {
    return `AH-2026-${String(1000 + this.seq)}`;
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new ReservationsService(repo, audit, bus);
  const actor: ReservationActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

const baseInput: CreateReservationInput = {
  source: "DIRECT",
  roomTypeId: "rt1", // baseRate 5000
  arrivalDate: "2026-08-10T00:00:00.000Z",
  departureDate: "2026-08-13T00:00:00.000Z", // 3 nuits
  adults: 2,
  currency: "XOF",
};

describe("Module 3 — Réservations", () => {
  it("crée une réservation PROVISIONAL avec prix calculé (3 nuits × 5000 + 18%)", async () => {
    const { service, actor } = setup();
    const res = await service.createReservation("h1", baseInput, actor);
    expect(res.status).toBe("PROVISIONAL");
    expect(res.bookingRef).toMatch(/^AH-2026-/);
    // 3×5000 = 15000 ; TVA 18% = 2700 ; total = 17700
    expect(res.amount).toBe(17700);
    expect(res.taxAmount).toBe(2700);
  });

  it("applique la remise dans le prix", async () => {
    const { service, actor } = setup();
    const res = await service.createReservation("h1", { ...baseInput, discountAmount: 2000 }, actor);
    // 15000 - 2000 = 13000 ; TVA 18% = 2340 ; total = 15340
    expect(res.amount).toBe(15340);
    expect(res.discountAmount).toBe(2000);
  });

  it("refuse une réservation si departure <= arrival", async () => {
    const { service, actor } = setup();
    await expect(
      service.createReservation("h1", { ...baseInput, departureDate: "2026-08-09T00:00:00.000Z" }, actor),
    ).rejects.toThrow(); // validation (ZodError)
  });

  it("refuse une double-réservation sur la même chambre", async () => {
    const { service, actor } = setup();
    const withRoom = { ...baseInput, roomId: "room-1" };
    await service.createReservation("h1", withRoom, actor);
    await expect(
      service.createReservation("h1", { ...withRoom, arrivalDate: "2026-08-11T00:00:00.000Z", departureDate: "2026-08-14T00:00:00.000Z" }, actor),
    ).rejects.toThrow(/déjà réservée/);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: ReservationActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createReservation("h1", baseInput, other)).rejects.toThrow(ReservationError);
  });

  it("enchaîne confirm → check-in → check-out et journalise + émet les événements", async () => {
    const { service, writer, bus, actor } = setup();
    const res = await service.createReservation("h1", baseInput, actor);

    const counts = { confirmed: 0, checkin: 0, checkout: 0 };
    bus.subscribe(DomainEvents.reservationConfirmed, () => void counts.confirmed++);
    bus.subscribe(DomainEvents.guestCheckedIn, () => void counts.checkin++);
    bus.subscribe(DomainEvents.guestCheckedOut, () => void counts.checkout++);

    await service.confirm("h1", res.id, actor);
    const ci = await service.checkIn("h1", res.id, actor);
    expect(ci.status).toBe("CHECKED_IN");
    const co = await service.checkOut("h1", res.id, actor);
    expect(co.status).toBe("CHECKED_OUT");

    expect(counts.confirmed).toBe(1);
    expect(counts.checkin).toBe(1);
    expect(counts.checkout).toBe(1);
    expect(writer.entries.some((e) => e.action === "reservations.checkout")).toBe(true);

    const history = await service.history("h1", res.id, actor);
    expect(history.length).toBe(3);
  });

  it("rejette une transition illégale (check-in avant confirmation)", async () => {
    const { service, actor } = setup();
    const res = await service.createReservation("h1", baseInput, actor);
    await expect(service.checkIn("h1", res.id, actor)).rejects.toThrow(/illégale/);
  });

  it("annule une réservation et émet reservation.cancelled", async () => {
    const { service, bus, actor } = setup();
    const res = await service.createReservation("h1", baseInput, actor);
    const c = { cancelled: 0 };
    bus.subscribe(DomainEvents.reservationCancelled, () => void c.cancelled++);
    await service.confirm("h1", res.id, actor);
    const cancelledRes = await service.cancel("h1", res.id, actor, "Client");
    expect(cancelledRes.status).toBe("CANCELLED");
    expect(c.cancelled).toBe(1);
  });

  it("liste par statut et par client", async () => {
    const { service, actor } = setup();
    const a = await service.createReservation("h1", { ...baseInput, guestId: "g1" }, actor);
    const b = await service.createReservation("h1", { ...baseInput, guestId: "g2", arrivalDate: "2026-09-01T00:00:00.000Z", departureDate: "2026-09-03T00:00:00.000Z" }, actor);
    await service.confirm("h1", a.id, actor);
    const all = await service.listReservations("h1", {}, actor);
    expect(all.length).toBe(2);
    const byStatus = await service.listReservations("h1", { status: "CONFIRMED" }, actor);
    expect(byStatus.length).toBe(1);
    void b;
  });
});
