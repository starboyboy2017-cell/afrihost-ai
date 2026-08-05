/**
 * Module 27 — Événements & Groupes : service métier.
 *
 * Gestion des groupes, entreprises/organisateurs (Company du CRM), événements
 * (séminaires, conférences, mariages, banquets, formations), réservation de
 * salles, capacités/disponibilités, équipements, contrats/devis, ordres de
 * service, documents, facturation groupe (via folios/paiements), coordination
 * housekeeping/restauration/transport.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC events.*.
 * Chaque mutation est journalisée (audit). Synchronisé avec CRM, Réservations,
 * POS, Comptabilité, Paiements, Transport, Housekeeping, Maintenance, Fidélité.
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { EventsError } from "./events.error.js";
import type { EventsRepository } from "./events.repository.js";
import type {
  CreateContractInput,
  CreateEquipmentInput,
  CreateEventInput,
  CreateGroupInput,
  CreateServiceOrderInput,
  CreateVenueInput,
  EventContract,
  EventDocument,
  EventEquipment,
  EventGroup,
  EventServiceOrder,
  EventVenue,
  HotelEvent,
} from "./events.types.js";
import {
  validateCreateContract,
  validateCreateEquipment,
  validateCreateEvent,
  validateCreateGroup,
  validateCreateServiceOrder,
  validateCreateVenue,
} from "./events.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface EventsActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class EventsService {
  constructor(
    private readonly repo: EventsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Groupes
  // ---------------------------------------------------------------------------

  async createGroup(hotelId: string, input: CreateGroupInput, actor: EventsActor): Promise<EventGroup> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateGroup(input);
    const group = await this.repo.createGroup(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.group.create", entityType: "EventGroup", entityId: group.id, after: { name: v.name, type: v.type } });
    await this.bus.publish({ name: DomainEvents.eventGroupCreated, hotelId, organisationId: actor.organisationId, data: { groupId: group.id, name: group.name } });
    return group;
  }

  async listGroups(hotelId: string, status: string | undefined, actor: EventsActor): Promise<EventGroup[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listGroups(hotelId, status);
  }

  async setGroupStatus(hotelId: string, groupId: string, status: string, actor: EventsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setGroupStatus(hotelId, groupId, status);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.group.status", entityType: "EventGroup", entityId: groupId, after: { status } });
  }

  /** Génère les chambres liées au groupe (mise à jour de l'allocation). */
  async allocateRooms(hotelId: string, groupId: string, rooms: number, actor: EventsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const g = await this.repo.getGroup(hotelId, groupId);
    if (!g) throw new EventsError("Groupe introuvable");
    await this.repo.updateGroupRooms(hotelId, groupId, rooms);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.group.allocate_rooms", entityType: "EventGroup", entityId: groupId, after: { rooms } });
  }

  // ---------------------------------------------------------------------------
  // Salles
  // ---------------------------------------------------------------------------

  async createVenue(hotelId: string, input: CreateVenueInput, actor: EventsActor): Promise<EventVenue> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateVenue(input);
    const venue = await this.repo.createVenue(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.venue.create", entityType: "EventVenue", entityId: venue.id, after: { name: v.name, capacity: v.capacity } });
    return venue;
  }

  async listVenues(hotelId: string, actor: EventsActor): Promise<EventVenue[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listVenues(hotelId);
  }

  // ---------------------------------------------------------------------------
  // Équipements
  // ---------------------------------------------------------------------------

  async createEquipment(hotelId: string, input: CreateEquipmentInput, actor: EventsActor): Promise<EventEquipment> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateEquipment(input);
    return this.repo.createEquipment(hotelId, v);
  }

  async listEquipments(hotelId: string, actor: EventsActor): Promise<EventEquipment[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listEquipments(hotelId);
  }

  // ---------------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------------

  /** Crée un événement en vérifiant la disponibilité de la salle. */
  async createEvent(hotelId: string, input: CreateEventInput, actor: EventsActor): Promise<HotelEvent> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateEvent(input);
    if (v.venueId && v.startAt && v.endAt) {
      if (!(await this.repo.venueAvailable(hotelId, v.venueId, new Date(v.startAt), new Date(v.endAt)))) {
        throw new EventsError("Salle indisponible sur cette période");
      }
    }
    const event = await this.repo.createEvent(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.event.create", entityType: "HotelEvent", entityId: event.id, after: { name: v.name, eventType: v.eventType } });
    await this.bus.publish({ name: DomainEvents.eventCreated, hotelId, organisationId: actor.organisationId, data: { eventId: event.id, name: event.name } });
    return event;
  }

  async listEvents(hotelId: string, status: string | undefined, venueId: string | undefined, actor: EventsActor): Promise<HotelEvent[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listEvents(hotelId, status, venueId);
  }

  async setEventStatus(hotelId: string, eventId: string, status: string, actor: EventsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setEventStatus(hotelId, eventId, status);
  }

  /** Calendrier interactif des salles et événements. */
  async calendar(hotelId: string, venueId: string | undefined, from: Date, to: Date, actor: EventsActor): Promise<HotelEvent[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.calendar(hotelId, venueId, from, to);
  }

  // ---------------------------------------------------------------------------
  // Contrats / devis
  // ---------------------------------------------------------------------------

  async createContract(hotelId: string, input: CreateContractInput, actor: EventsActor): Promise<EventContract> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateContract(input);
    const contract = await this.repo.createContract(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.contract.create", entityType: "EventContract", entityId: contract.id, after: { title: v.title, contractType: v.contractType } });
    return contract;
  }

  async listContracts(hotelId: string, actor: EventsActor): Promise<EventContract[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listContracts(hotelId);
  }

  async setContractStatus(hotelId: string, contractId: string, status: string, actor: EventsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setContractStatus(hotelId, contractId, status);
  }

  // ---------------------------------------------------------------------------
  // Ordres de service
  // ---------------------------------------------------------------------------

  async createServiceOrder(hotelId: string, input: CreateServiceOrderInput, actor: EventsActor): Promise<EventServiceOrder> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateServiceOrder(input);
    const order = await this.repo.createServiceOrder(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "events.service_order.create", entityType: "EventServiceOrder", entityId: order.id, after: { department: v.department, title: v.title } });
    return order;
  }

  async listServiceOrders(hotelId: string, department: string | undefined, actor: EventsActor): Promise<EventServiceOrder[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listServiceOrders(hotelId, department);
  }

  async setServiceOrderStatus(hotelId: string, orderId: string, status: string, actor: EventsActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setServiceOrderStatus(hotelId, orderId, status);
  }

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  async addDocument(hotelId: string, input: { groupId?: string | null; eventId?: string | null; name: string; kind?: string; url?: string | null }, actor: EventsActor): Promise<EventDocument> {
    this.assertHotel(hotelId, actor);
    return this.repo.addDocument(hotelId, input);
  }

  async listDocuments(hotelId: string, actor: EventsActor): Promise<EventDocument[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listDocuments(hotelId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertHotel(hotelId: string, actor: EventsActor): void {
    if (actor.hotelId !== hotelId) throw new EventsError("Accès inter-hôtel refusé");
  }
}
