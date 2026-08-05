import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { TransportService, type TransportActor } from "./transport.service.js";
import { TransportError } from "./transport.error.js";
import { assertTransferTransition } from "./transport.state.js";
import type { TransportRepository } from "./transport.repository.js";
import type {
  CreateDriverInput,
  CreateTransferInput,
  CreateVehicleInput,
  Driver,
  Transfer,
  TransferFilter,
  TransferStatus,
  Vehicle,
} from "./transport.types.js";

class MemoryRepo implements TransportRepository {
  vehicles = new Map<string, Vehicle>();
  drivers = new Map<string, Driver>();
  transfers = new Map<string, Transfer>();
  assignments = new Map<string, { vehicleId: string; driverId: string }>();
  seq = 0;

  async createVehicle(hotelId: string, input: CreateVehicleInput): Promise<Vehicle> {
    const v: Vehicle = { id: `v-${++this.seq}`, hotelId, name: input.name, plate: input.plate, capacity: input.capacity ?? 4, ownership: input.ownership ?? "INTERNAL", providerName: input.providerName ?? null, status: input.status ?? "AVAILABLE", createdAt: new Date(), updatedAt: new Date() };
    this.vehicles.set(v.id, v);
    return v;
  }
  async getVehicle(hotelId: string, id: string): Promise<Vehicle | null> {
    const v = this.vehicles.get(id);
    return v && v.hotelId === hotelId ? v : null;
  }
  async setVehicleStatus(hotelId: string, id: string, status: Vehicle["status"]): Promise<Vehicle> {
    const v = this.vehicles.get(id)!;
    const next = { ...v, status };
    this.vehicles.set(id, next);
    return next;
  }
  async listVehicles(hotelId: string): Promise<Vehicle[]> {
    return [...this.vehicles.values()].filter((v) => v.hotelId === hotelId);
  }
  async vehicleExists(hotelId: string, id: string): Promise<boolean> {
    const v = this.vehicles.get(id);
    return !!v && v.hotelId === hotelId;
  }
  async createDriver(hotelId: string, input: CreateDriverInput): Promise<Driver> {
    const d: Driver = { id: `d-${++this.seq}`, hotelId, firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null, licenseNo: input.licenseNo ?? null, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    this.drivers.set(d.id, d);
    return d;
  }
  async listDrivers(hotelId: string): Promise<Driver[]> {
    return [...this.drivers.values()].filter((d) => d.hotelId === hotelId);
  }
  async driverExists(hotelId: string, id: string): Promise<boolean> {
    const d = this.drivers.get(id);
    return !!d && d.hotelId === hotelId;
  }
  async createTransfer(hotelId: string, input: CreateTransferInput, transferRef: string): Promise<Transfer> {
    const t: Transfer = { id: `t-${++this.seq}`, hotelId, guestId: input.guestId ?? null, reservationId: input.reservationId ?? null, transferRef, type: input.type, status: "REQUESTED", pickupLocation: input.pickupLocation, dropoffLocation: input.dropoffLocation, scheduledAt: new Date(input.scheduledAt), paxCount: input.paxCount ?? 1, notes: input.notes ?? null, amount: input.amount ?? 0, currency: input.currency ?? "XOF", invoicedToReservation: false, createdAt: new Date(), updatedAt: new Date() };
    this.transfers.set(t.id, t);
    return t;
  }
  async getTransfer(hotelId: string, id: string): Promise<Transfer | null> {
    const t = this.transfers.get(id);
    return t && t.hotelId === hotelId ? t : null;
  }
  async setTransferStatus(hotelId: string, id: string, status: TransferStatus, changedBy?: string): Promise<Transfer> {
    const t = this.transfers.get(id)!;
    const next = { ...t, status, updatedAt: new Date() } as Transfer;
    this.transfers.set(id, next);
    return next;
  }
  async markTransferInvoiced(hotelId: string, id: string): Promise<Transfer> {
    const t = this.transfers.get(id)!;
    const next = { ...t, invoicedToReservation: true, updatedAt: new Date() } as Transfer;
    this.transfers.set(id, next);
    return next;
  }
  async listTransfers(filter: TransferFilter): Promise<{ transfers: Transfer[]; total: number }> {
    let list = [...this.transfers.values()].filter((t) => t.hotelId === filter.hotelId);
    if (filter.status) list = list.filter((t) => t.status === filter.status);
    if (filter.reservationId) list = list.filter((t) => t.reservationId === filter.reservationId);
    return { transfers: list, total: list.length };
  }
  async assign(hotelId: string, transferId: string, vehicleId: string, driverId: string, createdBy?: string): Promise<void> {
    this.assignments.set(transferId, { vehicleId, driverId });
  }
  async getAssignment(hotelId: string, transferId: string): Promise<{ vehicleId: string; driverId: string } | null> {
    return this.assignments.get(transferId) ?? null;
  }
  async nextTransferRef(): Promise<string> {
    return `TR-2026-${String(this.seq + 1).padStart(4, "0")}`;
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new TransportService(repo, audit, bus);
  const actor: TransportActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

const baseTransfer: CreateTransferInput = {
  type: "AIRPORT",
  pickupLocation: "Aéroport de Cotonou",
  dropoffLocation: "Hôtel Démo",
  scheduledAt: "2026-08-10T08:00:00.000Z",
  paxCount: 2,
  amount: 15000,
};

describe("Module 12 — Transport", () => {
  it("crée un véhicule interne et un externe", async () => {
    const { service, actor } = setup();
    const vi = await service.createVehicle("h1", { name: "Van 8 places", plate: "AB-1234", capacity: 8 }, actor);
    const ve = await service.createVehicle("h1", { name: "Berline", plate: "CD-5678", capacity: 3, ownership: "EXTERNAL", providerName: "Taxi Pro" }, actor);
    expect(vi.ownership).toBe("INTERNAL");
    expect(ve.ownership).toBe("EXTERNAL");
    expect(ve.providerName).toBe("Taxi Pro");
  });

  it("crée un chauffeur", async () => {
    const { service, actor } = setup();
    const d = await service.createDriver("h1", { firstName: "Jean", lastName: "Kouassi" }, actor);
    expect(d.firstName).toBe("Jean");
  });

  it("crée un transfert REQUESTED avec référence unique", async () => {
    const { service, actor } = setup();
    const t = await service.createTransfer("h1", baseTransfer, actor);
    expect(t.status).toBe("REQUESTED");
    expect(t.transferRef).toMatch(/^TR-2026-/);
  });

  it("déroule le cycle complet REQUESTED→CONFIRMED→ASSIGNED→IN_PROGRESS→COMPLETED", async () => {
    const { repo, service, actor } = setup();
    const v = await service.createVehicle("h1", { name: "Van", plate: "EF-9012", capacity: 8 }, actor);
    const d = await service.createDriver("h1", { firstName: "Paul", lastName: "Zinsou" }, actor);
    const t = await service.createTransfer("h1", baseTransfer, actor);
    await service.transition("h1", t.id, "CONFIRMED", actor);
    const assigned = await service.assign("h1", t.id, v.id, d.id, actor);
    expect(assigned.status).toBe("ASSIGNED");
    expect(repo.assignments.get(t.id)).toEqual({ vehicleId: v.id, driverId: d.id });
    await service.transition("h1", t.id, "IN_PROGRESS", actor);
    const done = await service.transition("h1", t.id, "COMPLETED", actor);
    expect(done.status).toBe("COMPLETED");
  });

  it("affectation automatique : véhicule disponible + chauffeur", async () => {
    const { repo, service, actor } = setup();
    const v = await service.createVehicle("h1", { name: "Van", plate: "GH-3456", capacity: 8 }, actor);
    const d = await service.createDriver("h1", { firstName: "A", lastName: "B" }, actor);
    const t = await service.createTransfer("h1", baseTransfer, actor);
    const assigned = await service.autoAssign("h1", t.id, actor);
    expect(assigned.status).toBe("ASSIGNED");
    expect(repo.vehicles.get(v.id)!.status).toBe("IN_USE");
    expect(repo.assignments.get(t.id)).toEqual({ vehicleId: v.id, driverId: d.id });
  });

  it("auto-affectation : erreur si aucun véhicule disponible", async () => {
    const { service, actor } = setup();
    const t = await service.createTransfer("h1", baseTransfer, actor);
    await expect(service.autoAssign("h1", t.id, actor)).rejects.toThrow(/Aucun véhicule/);
  });

  it("annule un transfert depuis REQUESTED", async () => {
    const { service, actor } = setup();
    const t = await service.createTransfer("h1", baseTransfer, actor);
    const cancelled = await service.transition("h1", t.id, "CANCELLED", actor);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("facture au folio de la réservation", async () => {
    const { repo, service, actor } = setup();
    const t = await service.createTransfer("h1", { ...baseTransfer, reservationId: "res1" }, actor);
    const invoiced = await service.markInvoiced("h1", t.id, actor);
    expect(invoiced.invoicedToReservation).toBe(true);
    expect(repo.transfers.get(t.id)!.invoicedToReservation).toBe(true);
  });

  it("refuse la facturation sans réservation liée", async () => {
    const { service, actor } = setup();
    const t = await service.createTransfer("h1", baseTransfer, actor);
    await expect(service.markInvoiced("h1", t.id, actor)).rejects.toThrow(/Aucune réservation/);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: TransportActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createTransfer("h1", baseTransfer, other)).rejects.toThrow(TransportError);
  });

  it("la machine à états rejette une transition illégale", () => {
    expect(() => assertTransferTransition("REQUESTED", "COMPLETED")).toThrow(TransportError);
    expect(() => assertTransferTransition("CONFIRMED", "ASSIGNED")).not.toThrow();
    expect(() => assertTransferTransition("COMPLETED", "IN_PROGRESS")).toThrow(TransportError);
  });

  it("liste et filtre par statut et réservation", async () => {
    const { service, actor } = setup();
    await service.createTransfer("h1", { ...baseTransfer, reservationId: "res1" }, actor);
    await service.createTransfer("h1", baseTransfer, actor);
    const all = await service.listTransfers("h1", {}, actor);
    expect(all.total).toBe(2);
    const byRes = await service.listTransfers("h1", { reservationId: "res1" }, actor);
    expect(byRes.total).toBe(1);
  });
});
