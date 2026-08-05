import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { EventsService, type EventsActor } from "./events.service.js";
import { EventsError } from "./events.error.js";
import type { EventsRepository } from "./events.repository.js";
import type {
  CreateContractInput, CreateEquipmentInput, CreateEventInput, CreateGroupInput,
  CreateServiceOrderInput, CreateVenueInput, EventContract, EventDocument, EventEquipment,
  EventGroup, EventServiceOrder, EventVenue, HotelEvent,
} from "./events.types.js";

let seq = 0;

class MemoryRepo implements EventsRepository {
  groups: EventGroup[] = [];
  venues: EventVenue[] = [];
  equipments: EventEquipment[] = [];
  events: HotelEvent[] = [];
  contracts: EventContract[] = [];
  orders: EventServiceOrder[] = [];
  documents: EventDocument[] = [];

  async createGroup(hotelId: string, input: CreateGroupInput): Promise<EventGroup> {
    const g: EventGroup = { id: `grp-${++seq}`, hotelId, companyId: input.companyId ?? null, name: input.name, type: input.type ?? "GROUP", contactName: input.contactName ?? null, contactEmail: input.contactEmail ?? null, contactPhone: input.contactPhone ?? null, roomsAllocated: 0, totalRooms: input.totalRooms ?? 0, arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : null, departureDate: input.departureDate ? new Date(input.departureDate) : null, status: "PROSPECT", notes: input.notes ?? null };
    this.groups.push(g); return g;
  }
  async listGroups(hotelId: string, status?: string): Promise<EventGroup[]> { return this.groups.filter((g) => g.hotelId === hotelId && (status ? g.status === status : true)); }
  async getGroup(hotelId: string, groupId: string): Promise<EventGroup | null> { return this.groups.find((g) => g.id === groupId && g.hotelId === hotelId) ?? null; }
  async setGroupStatus(hotelId: string, groupId: string, status: string): Promise<void> { const g = this.groups.find((x) => x.id === groupId)!; g.status = status; }
  async updateGroupRooms(hotelId: string, groupId: string, roomsAllocated: number): Promise<void> { const g = this.groups.find((x) => x.id === groupId)!; g.roomsAllocated = roomsAllocated; }

  async createVenue(hotelId: string, input: CreateVenueInput): Promise<EventVenue> {
    const v: EventVenue = { id: `ven-${++seq}`, hotelId, name: input.name, capacity: input.capacity ?? 0, seatingModes: input.seatingModes ?? null, basePrice: input.basePrice ?? 0, currency: input.currency ?? "XOF", isActive: true };
    this.venues.push(v); return v;
  }
  async listVenues(hotelId: string): Promise<EventVenue[]> { return this.venues.filter((v) => v.hotelId === hotelId); }
  async setVenueActive(hotelId: string, venueId: string, isActive: boolean): Promise<void> { const v = this.venues.find((x) => x.id === venueId)!; v.isActive = isActive; }

  async createEquipment(hotelId: string, input: CreateEquipmentInput): Promise<EventEquipment> {
    const e: EventEquipment = { id: `eq-${++seq}`, hotelId, name: input.name, category: input.category ?? "AV", quantity: input.quantity ?? 1, available: input.quantity ?? 1, isActive: true };
    this.equipments.push(e); return e;
  }
  async listEquipments(hotelId: string): Promise<EventEquipment[]> { return this.equipments.filter((e) => e.hotelId === hotelId); }

  async createEvent(hotelId: string, input: CreateEventInput): Promise<HotelEvent> {
    const ev: HotelEvent = { id: `evt-${++seq}`, hotelId, groupId: input.groupId ?? null, venueId: input.venueId ?? null, name: input.name, eventType: input.eventType ?? "SEMINAR", startAt: input.startAt ? new Date(input.startAt) : null, endAt: input.endAt ? new Date(input.endAt) : null, expectedAttendees: input.expectedAttendees ?? 0, status: "PLANNED", notes: input.notes ?? null };
    this.events.push(ev); return ev;
  }
  async listEvents(hotelId: string, status?: string, venueId?: string): Promise<HotelEvent[]> { return this.events.filter((e) => e.hotelId === hotelId && (status ? e.status === status : true) && (venueId ? e.venueId === venueId : true)); }
  async getEvent(hotelId: string, eventId: string): Promise<HotelEvent | null> { return this.events.find((e) => e.id === eventId && e.hotelId === hotelId) ?? null; }
  async setEventStatus(hotelId: string, eventId: string, status: string): Promise<void> { const e = this.events.find((x) => x.id === eventId)!; e.status = status; }
  async calendar(hotelId: string, venueId?: string, from?: Date, to?: Date): Promise<HotelEvent[]> {
    return this.events.filter((e) => e.hotelId === hotelId && (venueId ? e.venueId === venueId : true) && (from ? !e.endAt || e.endAt >= from : true) && (to ? !e.startAt || e.startAt <= to : true));
  }
  async venueAvailable(hotelId: string, venueId: string, from: Date, to: Date, excludeEventId?: string): Promise<boolean> {
    return !this.events.some((e) => e.venueId === venueId && e.id !== excludeEventId && e.startAt && e.endAt && e.startAt < to && e.endAt > from);
  }

  async createContract(hotelId: string, input: CreateContractInput): Promise<EventContract> {
    const c: EventContract = { id: `ctr-${++seq}`, hotelId, groupId: input.groupId ?? null, eventId: input.eventId ?? null, title: input.title, contractType: input.contractType ?? "QUOTE", amount: input.amount ?? 0, currency: input.currency ?? "XOF", status: "DRAFT", validUntil: input.validUntil ? new Date(input.validUntil) : null, signedAt: null };
    this.contracts.push(c); return c;
  }
  async listContracts(hotelId: string): Promise<EventContract[]> { return this.contracts.filter((c) => c.hotelId === hotelId); }
  async setContractStatus(hotelId: string, contractId: string, status: string): Promise<void> { const c = this.contracts.find((x) => x.id === contractId)!; c.status = status; }

  async createServiceOrder(hotelId: string, input: CreateServiceOrderInput): Promise<EventServiceOrder> {
    const o: EventServiceOrder = { id: `ord-${++seq}`, hotelId, groupId: input.groupId ?? null, eventId: input.eventId ?? null, department: input.department, title: input.title, detail: input.detail ?? null, status: "PENDING", dueAt: input.dueAt ? new Date(input.dueAt) : null };
    this.orders.push(o); return o;
  }
  async listServiceOrders(hotelId: string, department?: string): Promise<EventServiceOrder[]> { return this.orders.filter((o) => o.hotelId === hotelId && (department ? o.department === department : true)); }
  async setServiceOrderStatus(hotelId: string, orderId: string, status: string): Promise<void> { const o = this.orders.find((x) => x.id === orderId)!; o.status = status; }

  async addDocument(hotelId: string, input: { groupId?: string | null; eventId?: string | null; name: string; kind?: string; url?: string | null }): Promise<EventDocument> {
    const d: EventDocument = { id: `doc-${++seq}`, hotelId, groupId: input.groupId ?? null, eventId: input.eventId ?? null, name: input.name, kind: input.kind ?? "OTHER", url: input.url ?? null };
    this.documents.push(d); return d;
  }
  async listDocuments(hotelId: string): Promise<EventDocument[]> { return this.documents.filter((d) => d.hotelId === hotelId); }
}

const actorH1: EventsActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new EventsService(repo, audit, bus);
  return { repo, svc, bus };
}

describe("events.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée un groupe", async () => {
    const { svc } = build();
    const g = await svc.createGroup("h1", { name: "Séminaire Banque", type: "CORPORATE", totalRooms: 20 }, actorH1);
    expect(g.id).toBeTruthy();
    expect(g.status).toBe("PROSPECT");
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.listGroups("h2", undefined, actorH1)).rejects.toThrow(EventsError);
  });

  it("crée une salle et alloue les chambres d'un groupe", async () => {
    const { repo, svc } = build();
    const g = await svc.createGroup("h1", { name: "Groupe A" }, actorH1);
    await svc.allocateRooms("h1", g.id, 15, actorH1);
    expect(repo.groups.find((x) => x.id === g.id)!.roomsAllocated).toBe(15);
    const v = await svc.createVenue("h1", { name: "Salle Grand Saphir", capacity: 200, basePrice: 50000 }, actorH1);
    expect(v.capacity).toBe(200);
  });

  it("crée un équipement", async () => {
    const { repo, svc } = build();
    const e = await svc.createEquipment("h1", { name: "Projecteur", category: "AV", quantity: 2 }, actorH1);
    expect(e.quantity).toBe(2);
    expect(repo.equipments.length).toBe(1);
  });

  it("crée un événement dans une salle disponible", async () => {
    const { svc } = build();
    const v = await svc.createVenue("h1", { name: "Salle A", capacity: 100 }, actorH1);
    const ev = await svc.createEvent("h1", { venueId: v.id, name: "Conférence", startAt: "2026-08-10T09:00:00Z", endAt: "2026-08-10T17:00:00Z" }, actorH1);
    expect(ev.name).toBe("Conférence");
    expect(ev.status).toBe("PLANNED");
  });

  it("refuse un événement si la salle est déjà réservée", async () => {
    const { svc } = build();
    const v = await svc.createVenue("h1", { name: "Salle B" }, actorH1);
    await svc.createEvent("h1", { venueId: v.id, name: "E1", startAt: "2026-08-10T09:00:00Z", endAt: "2026-08-10T17:00:00Z" }, actorH1);
    await expect(svc.createEvent("h1", { venueId: v.id, name: "E2", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T12:00:00Z" }, actorH1)).rejects.toThrow("indisponible");
  });

  it("génère le calendrier des événements", async () => {
    const { svc } = build();
    const v = await svc.createVenue("h1", { name: "Salle C" }, actorH1);
    await svc.createEvent("h1", { venueId: v.id, name: "Séminaire", startAt: "2026-08-12T09:00:00Z", endAt: "2026-08-12T16:00:00Z" }, actorH1);
    const cal = await svc.calendar("h1", v.id, new Date("2026-08-01"), new Date("2026-08-31"), actorH1);
    expect(cal.length).toBe(1);
  });

  it("crée un contrat / devis et le signe", async () => {
    const { repo, svc } = build();
    const c = await svc.createContract("h1", { title: "Devis séminaire", contractType: "QUOTE", amount: 500000 }, actorH1);
    expect(c.status).toBe("DRAFT");
    await svc.setContractStatus("h1", c.id, "SIGNED", actorH1);
    expect(repo.contracts.find((x) => x.id === c.id)!.status).toBe("SIGNED");
  });

  it("crée un ordre de service pour un département", async () => {
    const { repo, svc } = build();
    const o = await svc.createServiceOrder("h1", { department: "catering", title: "Banquet 80 couverts" }, actorH1);
    expect(o.department).toBe("catering");
    expect(repo.orders.some((x) => x.title === "Banquet 80 couverts")).toBe(true);
  });

  it("ajoute un document", async () => {
    const { repo, svc } = build();
    await svc.addDocument("h1", { name: "contrat.pdf", kind: "CONTRACT", url: "/docs/contrat.pdf" }, actorH1);
    expect(repo.documents.length).toBe(1);
  });
});
