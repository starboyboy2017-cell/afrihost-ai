import { describe, it, expect } from "vitest";
import { FrontDeskService, FrontDeskError, type FrontDeskActor } from "./frontdesk.service.js";
import { deriveStatus, type FrontDeskRepository } from "./frontdesk.repository.js";
import type { AvailabilityBoard, AvailabilityFilter, AvailabilityRow } from "./frontdesk.types.js";

class MemoryRepo implements FrontDeskRepository {
  rows: AvailabilityRow[];
  constructor() {
    this.rows = [
      { roomId: "r1", roomNumber: "101", floor: 1, status: "AVAILABLE", roomTypeId: "rt1", roomTypeName: "Standard" },
      { roomId: "r2", roomNumber: "102", floor: 1, status: "OCCUPIED", roomTypeId: "rt1", roomTypeName: "Standard", guestName: "Amadou Diallo", reservationId: "res1", bookingRef: "AH-2026-90001", checkInAt: new Date("2026-08-01"), departureDate: new Date("2026-08-05") },
      { roomId: "r3", roomNumber: "201", floor: 2, status: "RESERVED", roomTypeId: "rt2", roomTypeName: "Suite", reservationId: "res2", bookingRef: "AH-2026-90002", arrivalDate: new Date("2026-08-10") },
      { roomId: "r4", roomNumber: "202", floor: 2, status: "DIRTY", roomTypeId: "rt2", roomTypeName: "Suite" },
      { roomId: "r5", roomNumber: "301", floor: 3, status: "OUT_OF_ORDER", roomTypeId: "rt3", roomTypeName: "Familiale" },
      { roomId: "r6", roomNumber: "302", floor: 3, status: "OUT_OF_SERVICE", roomTypeId: "rt3", roomTypeName: "Familiale" },
    ];
  }
  async getBoard(hotelId: string, filter: AvailabilityFilter): Promise<{ rows: AvailabilityRow[]; total: number }> {
    let list = this.rows.slice();
    if (filter.floor !== undefined) list = list.filter((r) => r.floor === filter.floor);
    if (filter.roomTypeId) list = list.filter((r) => r.roomTypeId === filter.roomTypeId);
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (r) => r.roomNumber.toLowerCase().includes(q) || (r.guestName ?? "").toLowerCase().includes(q),
      );
    }
    const total = list.length;
    const limit = filter.limit ?? 500;
    const offset = filter.offset ?? 0;
    return { rows: list.slice(offset, offset + limit), total };
  }
}

function setup() {
  const repo = new MemoryRepo();
  const service = new FrontDeskService(repo);
  const actor: FrontDeskActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, service, actor };
}

describe("Module 8 — Tableau de disponibilité", () => {
  it("renvoie le tableau complet avec compteurs par indicateur", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", {}, actor);
    expect(board.total).toBe(6);
    expect(board.counts.available).toBe(1);
    expect(board.counts.occupied).toBe(1);
    expect(board.counts.reserved).toBe(1);
    expect(board.counts.cleaning).toBe(1); // DIRTY
    expect(board.counts.maintenance).toBe(1); // OUT_OF_ORDER
    expect(board.counts.out_of_service).toBe(1);
  });

  it("filtre par étage", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", { floor: 2 }, actor);
    expect(board.total).toBe(2);
  });

  it("filtre par type de chambre", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", { roomTypeId: "rt2" }, actor);
    expect(board.total).toBe(2);
  });

  it("filtre par statut", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", { status: "OCCUPIED" }, actor);
    expect(board.total).toBe(1);
  });

  it("recherche par numéro de chambre", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", { search: "102" }, actor);
    expect(board.total).toBe(1);
    expect(board.rows[0]!.roomNumber).toBe("102");
  });

  it("recherche par nom de client", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", { search: "Amadou" }, actor);
    expect(board.total).toBe(1);
    expect(board.rows[0]!.guestName).toContain("Amadou");
  });

  it("la ligne occupée contient l'occupant, la réservation et la période", async () => {
    const { service, actor } = setup();
    const board = await service.getBoard("h1", { search: "102" }, actor);
    const row = board.rows[0]!;
    expect(row.guestName).toBe("Amadou Diallo");
    expect(row.bookingRef).toBe("AH-2026-90001");
    expect(row.departureDate).toBeTruthy();
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: FrontDeskActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.getBoard("h1", {}, other)).rejects.toThrow(FrontDeskError);
  });

  it("deriveStatus mappe correctement les indicateurs visuels", () => {
    expect(deriveStatus("AVAILABLE")).toBe("available");
    expect(deriveStatus("OCCUPIED")).toBe("occupied");
    expect(deriveStatus("RESERVED")).toBe("reserved");
    expect(deriveStatus("CLEANING")).toBe("cleaning");
    expect(deriveStatus("DIRTY")).toBe("cleaning");
    expect(deriveStatus("OUT_OF_ORDER")).toBe("maintenance");
    expect(deriveStatus("OUT_OF_SERVICE")).toBe("out_of_service");
  });
});
