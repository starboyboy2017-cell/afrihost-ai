/**
 * Module 27 — Événements & Groupes : adapter Prisma.
 */
import type {
  EventsRepository,
  CreateContractInput, CreateEquipmentInput, CreateEventInput, CreateGroupInput,
  CreateServiceOrderInput, CreateVenueInput, EventContract, EventDocument, EventEquipment,
  EventGroup, EventServiceOrder, EventVenue, HotelEvent,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue | undefined => v as Prisma.InputJsonValue;

function mapGroup(g: {
  id: string; hotelId: string; companyId: string | null; name: string; type: string; contactName: string | null;
  contactEmail: string | null; contactPhone: string | null; roomsAllocated: number; totalRooms: number;
  arrivalDate: Date | null; departureDate: Date | null; status: string; notes: string | null;
}): EventGroup {
  return { id: g.id, hotelId: g.hotelId, companyId: g.companyId, name: g.name, type: g.type, contactName: g.contactName, contactEmail: g.contactEmail, contactPhone: g.contactPhone, roomsAllocated: g.roomsAllocated, totalRooms: g.totalRooms, arrivalDate: g.arrivalDate, departureDate: g.departureDate, status: g.status, notes: g.notes };
}

export class PrismaEventsRepository implements EventsRepository {
  async createGroup(hotelId: string, input: CreateGroupInput): Promise<EventGroup> {
    const g = await prisma.eventGroup.create({ data: { hotelId, companyId: input.companyId ?? null, name: input.name, type: input.type ?? "GROUP", contactName: input.contactName ?? null, contactEmail: input.contactEmail ?? null, contactPhone: input.contactPhone ?? null, totalRooms: input.totalRooms ?? 0, arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : null, departureDate: input.departureDate ? new Date(input.departureDate) : null, notes: input.notes ?? null } });
    return mapGroup(g);
  }
  async listGroups(hotelId: string, status?: string): Promise<EventGroup[]> {
    const rows = await prisma.eventGroup.findMany({ where: { hotelId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" } });
    return rows.map(mapGroup);
  }
  async getGroup(hotelId: string, groupId: string): Promise<EventGroup | null> {
    const g = await prisma.eventGroup.findFirst({ where: { id: groupId, hotelId } });
    return g ? mapGroup(g) : null;
  }
  async setGroupStatus(hotelId: string, groupId: string, status: string): Promise<void> {
    await prisma.eventGroup.update({ where: { id: groupId, hotelId }, data: { status } });
  }
  async updateGroupRooms(hotelId: string, groupId: string, roomsAllocated: number): Promise<void> {
    await prisma.eventGroup.update({ where: { id: groupId, hotelId }, data: { roomsAllocated } });
  }

  async createVenue(hotelId: string, input: CreateVenueInput): Promise<EventVenue> {
    const v = await prisma.eventVenue.create({ data: { hotelId, name: input.name, capacity: input.capacity ?? 0, seatingModes: input.seatingModes ? json(input.seatingModes) : undefined, basePrice: input.basePrice ?? 0, currency: input.currency ?? "XOF" } });
    return { id: v.id, hotelId: v.hotelId, name: v.name, capacity: v.capacity, seatingModes: v.seatingModes as Record<string, unknown> | null, basePrice: v.basePrice, currency: v.currency, isActive: v.isActive };
  }
  async listVenues(hotelId: string): Promise<EventVenue[]> {
    const rows = await prisma.eventVenue.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((v) => ({ id: v.id, hotelId: v.hotelId, name: v.name, capacity: v.capacity, seatingModes: v.seatingModes as Record<string, unknown> | null, basePrice: v.basePrice, currency: v.currency, isActive: v.isActive }));
  }
  async setVenueActive(hotelId: string, venueId: string, isActive: boolean): Promise<void> {
    await prisma.eventVenue.update({ where: { id: venueId, hotelId }, data: { isActive } });
  }

  async createEquipment(hotelId: string, input: CreateEquipmentInput): Promise<EventEquipment> {
    const e = await prisma.eventEquipment.create({ data: { hotelId, name: input.name, category: input.category ?? "AV", quantity: input.quantity ?? 1, available: input.quantity ?? 1 } });
    return { id: e.id, hotelId: e.hotelId, name: e.name, category: e.category, quantity: e.quantity, available: e.available, isActive: e.isActive };
  }
  async listEquipments(hotelId: string): Promise<EventEquipment[]> {
    const rows = await prisma.eventEquipment.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((e) => ({ id: e.id, hotelId: e.hotelId, name: e.name, category: e.category, quantity: e.quantity, available: e.available, isActive: e.isActive }));
  }

  async createEvent(hotelId: string, input: CreateEventInput): Promise<HotelEvent> {
    const ev = await prisma.hotelEvent.create({ data: { hotelId, groupId: input.groupId ?? null, venueId: input.venueId ?? null, name: input.name, eventType: input.eventType ?? "SEMINAR", startAt: input.startAt ? new Date(input.startAt) : null, endAt: input.endAt ? new Date(input.endAt) : null, expectedAttendees: input.expectedAttendees ?? 0, notes: input.notes ?? null } });
    return { id: ev.id, hotelId: ev.hotelId, groupId: ev.groupId, venueId: ev.venueId, name: ev.name, eventType: ev.eventType, startAt: ev.startAt, endAt: ev.endAt, expectedAttendees: ev.expectedAttendees, status: ev.status, notes: ev.notes };
  }
  async listEvents(hotelId: string, status?: string, venueId?: string): Promise<HotelEvent[]> {
    const rows = await prisma.hotelEvent.findMany({ where: { hotelId, ...(status ? { status } : {}), ...(venueId ? { venueId } : {}) }, orderBy: { startAt: "asc" } });
    return rows.map((ev) => ({ id: ev.id, hotelId: ev.hotelId, groupId: ev.groupId, venueId: ev.venueId, name: ev.name, eventType: ev.eventType, startAt: ev.startAt, endAt: ev.endAt, expectedAttendees: ev.expectedAttendees, status: ev.status, notes: ev.notes }));
  }
  async getEvent(hotelId: string, eventId: string): Promise<HotelEvent | null> {
    const ev = await prisma.hotelEvent.findFirst({ where: { id: eventId, hotelId } });
    return ev ? { id: ev.id, hotelId: ev.hotelId, groupId: ev.groupId, venueId: ev.venueId, name: ev.name, eventType: ev.eventType, startAt: ev.startAt, endAt: ev.endAt, expectedAttendees: ev.expectedAttendees, status: ev.status, notes: ev.notes } : null;
  }
  async setEventStatus(hotelId: string, eventId: string, status: string): Promise<void> {
    await prisma.hotelEvent.update({ where: { id: eventId, hotelId }, data: { status } });
  }
  async calendar(hotelId: string, venueId?: string, from?: Date, to?: Date): Promise<HotelEvent[]> {
    const rows = await prisma.hotelEvent.findMany({
      where: { hotelId, ...(venueId ? { venueId } : {}), ...(from ? { OR: [{ endAt: null }, { endAt: { gte: from } }] } : {}), ...(to ? { OR: [{ startAt: null }, { startAt: { lte: to } }] } : {}) },
      orderBy: { startAt: "asc" },
    });
    return rows.map((ev) => ({ id: ev.id, hotelId: ev.hotelId, groupId: ev.groupId, venueId: ev.venueId, name: ev.name, eventType: ev.eventType, startAt: ev.startAt, endAt: ev.endAt, expectedAttendees: ev.expectedAttendees, status: ev.status, notes: ev.notes }));
  }
  async venueAvailable(hotelId: string, venueId: string, from: Date, to: Date, excludeEventId?: string): Promise<boolean> {
    const conflict = await prisma.hotelEvent.findFirst({
      where: { hotelId, venueId, id: excludeEventId ? { not: excludeEventId } : undefined, startAt: { lt: to }, endAt: { gt: from } },
    });
    return conflict === null;
  }

  async createContract(hotelId: string, input: CreateContractInput): Promise<EventContract> {
    const c = await prisma.eventContract.create({ data: { hotelId, groupId: input.groupId ?? null, eventId: input.eventId ?? null, title: input.title, contractType: input.contractType ?? "QUOTE", amount: input.amount ?? 0, currency: input.currency ?? "XOF", validUntil: input.validUntil ? new Date(input.validUntil) : null } });
    return { id: c.id, hotelId: c.hotelId, groupId: c.groupId, eventId: c.eventId, title: c.title, contractType: c.contractType, amount: c.amount, currency: c.currency, status: c.status, validUntil: c.validUntil, signedAt: c.signedAt };
  }
  async listContracts(hotelId: string): Promise<EventContract[]> {
    const rows = await prisma.eventContract.findMany({ where: { hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map((c) => ({ id: c.id, hotelId: c.hotelId, groupId: c.groupId, eventId: c.eventId, title: c.title, contractType: c.contractType, amount: c.amount, currency: c.currency, status: c.status, validUntil: c.validUntil, signedAt: c.signedAt }));
  }
  async setContractStatus(hotelId: string, contractId: string, status: string): Promise<void> {
    await prisma.eventContract.update({ where: { id: contractId, hotelId }, data: { status, ...(status === "SIGNED" ? { signedAt: new Date() } : {}) } });
  }

  async createServiceOrder(hotelId: string, input: CreateServiceOrderInput): Promise<EventServiceOrder> {
    const o = await prisma.eventServiceOrder.create({ data: { hotelId, groupId: input.groupId ?? null, eventId: input.eventId ?? null, department: input.department, title: input.title, detail: input.detail ?? null, dueAt: input.dueAt ? new Date(input.dueAt) : null } });
    return { id: o.id, hotelId: o.hotelId, groupId: o.groupId, eventId: o.eventId, department: o.department, title: o.title, detail: o.detail, status: o.status, dueAt: o.dueAt };
  }
  async listServiceOrders(hotelId: string, department?: string): Promise<EventServiceOrder[]> {
    const rows = await prisma.eventServiceOrder.findMany({ where: { hotelId, ...(department ? { department } : {}) }, orderBy: { createdAt: "desc" } });
    return rows.map((o) => ({ id: o.id, hotelId: o.hotelId, groupId: o.groupId, eventId: o.eventId, department: o.department, title: o.title, detail: o.detail, status: o.status, dueAt: o.dueAt }));
  }
  async setServiceOrderStatus(hotelId: string, orderId: string, status: string): Promise<void> {
    await prisma.eventServiceOrder.update({ where: { id: orderId, hotelId }, data: { status } });
  }

  async addDocument(hotelId: string, input: { groupId?: string | null; eventId?: string | null; name: string; kind?: string; url?: string | null }): Promise<EventDocument> {
    const d = await prisma.eventDocument.create({ data: { hotelId, groupId: input.groupId ?? null, eventId: input.eventId ?? null, name: input.name, kind: input.kind ?? "OTHER", url: input.url ?? null } });
    return { id: d.id, hotelId: d.hotelId, groupId: d.groupId, eventId: d.eventId, name: d.name, kind: d.kind, url: d.url };
  }
  async listDocuments(hotelId: string): Promise<EventDocument[]> {
    const rows = await prisma.eventDocument.findMany({ where: { hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map((d) => ({ id: d.id, hotelId: d.hotelId, groupId: d.groupId, eventId: d.eventId, name: d.name, kind: d.kind, url: d.url }));
  }
}
