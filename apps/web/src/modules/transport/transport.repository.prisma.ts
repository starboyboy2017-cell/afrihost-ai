/**
 * Module 12 — Transport : adapter Prisma.
 */
import type {
  TransportRepository,
  CreateDriverInput,
  CreateTransferInput,
  CreateVehicleInput,
  Driver,
  Transfer,
  TransferFilter,
  TransferStatus,
  Vehicle,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaTransportRepository implements TransportRepository {
  async createVehicle(hotelId: string, input: CreateVehicleInput): Promise<Vehicle> {
    const v = await prisma.vehicle.create({
      data: {
        hotelId, name: input.name, plate: input.plate, capacity: input.capacity ?? 4,
        ownership: input.ownership ?? "INTERNAL", providerName: input.providerName ?? null,
        status: input.status ?? "AVAILABLE",
      },
    });
    return mapVehicle(v);
  }
  async getVehicle(hotelId: string, id: string): Promise<Vehicle | null> {
    const v = await prisma.vehicle.findFirst({ where: { id, hotelId } });
    return v ? mapVehicle(v) : null;
  }
  async setVehicleStatus(hotelId: string, id: string, status: Vehicle["status"]): Promise<Vehicle> {
    const v = await prisma.vehicle.update({ where: { id, hotelId }, data: { status } });
    return mapVehicle(v);
  }
  async listVehicles(hotelId: string): Promise<Vehicle[]> {
    const rows = await prisma.vehicle.findMany({ where: { hotelId, deletedAt: null }, orderBy: { name: "asc" } });
    return rows.map(mapVehicle);
  }
  async vehicleExists(hotelId: string, id: string): Promise<boolean> {
    const v = await prisma.vehicle.findFirst({ where: { id, hotelId } });
    return v !== null;
  }
  async createDriver(hotelId: string, input: CreateDriverInput): Promise<Driver> {
    const d = await prisma.driver.create({ data: { hotelId, firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null, licenseNo: input.licenseNo ?? null } });
    return mapDriver(d);
  }
  async listDrivers(hotelId: string): Promise<Driver[]> {
    const rows = await prisma.driver.findMany({ where: { hotelId }, orderBy: { firstName: "asc" } });
    return rows.map(mapDriver);
  }
  async driverExists(hotelId: string, id: string): Promise<boolean> {
    const d = await prisma.driver.findFirst({ where: { id, hotelId } });
    return d !== null;
  }
  async createTransfer(hotelId: string, input: CreateTransferInput, transferRef: string): Promise<Transfer> {
    const t = await prisma.transfer.create({
      data: {
        hotelId, guestId: input.guestId ?? null, reservationId: input.reservationId ?? null, transferRef,
        type: input.type, pickupLocation: input.pickupLocation, dropoffLocation: input.dropoffLocation,
        scheduledAt: new Date(input.scheduledAt), paxCount: input.paxCount ?? 1, notes: input.notes ?? null,
        amount: input.amount ?? 0, currency: input.currency ?? "XOF",
      },
    });
    return mapTransfer(t);
  }
  async getTransfer(hotelId: string, id: string): Promise<Transfer | null> {
    const t = await prisma.transfer.findFirst({ where: { id, hotelId } });
    return t ? mapTransfer(t) : null;
  }
  async setTransferStatus(hotelId: string, id: string, status: TransferStatus, changedBy?: string): Promise<Transfer> {
    const t = await prisma.transfer.update({ where: { id, hotelId }, data: { status } });
    return mapTransfer(t);
  }
  async markTransferInvoiced(hotelId: string, id: string): Promise<Transfer> {
    const t = await prisma.transfer.update({ where: { id, hotelId }, data: { invoicedToReservation: true } });
    return mapTransfer(t);
  }
  async listTransfers(filter: TransferFilter): Promise<{ transfers: Transfer[]; total: number }> {
    const where: Record<string, unknown> = {
      hotelId: filter.hotelId, deletedAt: null, status: filter.status, reservationId: filter.reservationId,
      scheduledAt: { gte: filter.from, lte: filter.to },
    };
    const [rows, total] = await prisma.$transaction([
      prisma.transfer.findMany({ where, orderBy: { scheduledAt: "asc" }, skip: filter.offset ?? 0, take: filter.limit ?? 100 }),
      prisma.transfer.count({ where }),
    ]);
    return { transfers: rows.map(mapTransfer), total };
  }
  async assign(hotelId: string, transferId: string, vehicleId: string, driverId: string, createdBy?: string): Promise<void> {
    await prisma.transferAssignment.create({ data: { transferId, vehicleId, driverId, createdBy } });
  }
  async getAssignment(hotelId: string, transferId: string): Promise<{ vehicleId: string; driverId: string } | null> {
    const a = await prisma.transferAssignment.findFirst({ where: { transferId } });
    return a ? { vehicleId: a.vehicleId, driverId: a.driverId } : null;
  }
  async nextTransferRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.transfer.findFirst({ where: { transferRef: { startsWith: `TR-${year}-` } }, orderBy: { transferRef: "desc" }, select: { transferRef: true } });
    const seq = last ? parseInt(last.transferRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `TR-${year}-${String(seq).padStart(4, "0")}`;
  }
}

type VehicleRow = { id: string; hotelId: string; name: string; plate: string; capacity: number; ownership: string; providerName: string | null; status: string; createdAt: Date; updatedAt: Date };
function mapVehicle(v: VehicleRow): Vehicle {
  return { id: v.id, hotelId: v.hotelId, name: v.name, plate: v.plate, capacity: v.capacity, ownership: v.ownership as Vehicle["ownership"], providerName: v.providerName, status: v.status as Vehicle["status"], createdAt: v.createdAt, updatedAt: v.updatedAt };
}
type DriverRow = { id: string; hotelId: string; firstName: string; lastName: string; phone: string | null; licenseNo: string | null; isActive: boolean; createdAt: Date; updatedAt: Date };
function mapDriver(d: DriverRow): Driver {
  return { id: d.id, hotelId: d.hotelId, firstName: d.firstName, lastName: d.lastName, phone: d.phone, licenseNo: d.licenseNo, isActive: d.isActive };
}
type TransferRow = { id: string; hotelId: string; guestId: string | null; reservationId: string | null; transferRef: string; type: string; status: string; pickupLocation: string; dropoffLocation: string; scheduledAt: Date; paxCount: number; notes: string | null; amount: number; currency: string | null; invoicedToReservation: boolean; createdAt: Date; updatedAt: Date };
function mapTransfer(t: TransferRow): Transfer {
  return { id: t.id, hotelId: t.hotelId, guestId: t.guestId, reservationId: t.reservationId, transferRef: t.transferRef, type: t.type as Transfer["type"], status: t.status as Transfer["status"], pickupLocation: t.pickupLocation, dropoffLocation: t.dropoffLocation, scheduledAt: t.scheduledAt, paxCount: t.paxCount, notes: t.notes, amount: t.amount, currency: t.currency, invoicedToReservation: t.invoicedToReservation, createdAt: t.createdAt, updatedAt: t.updatedAt };
}
