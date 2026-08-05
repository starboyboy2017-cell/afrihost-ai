/**
 * Module 27 — Événements & Groupes : port de persistance.
 */
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

export interface EventsRepository {
  // Groupes
  createGroup(hotelId: string, input: CreateGroupInput): Promise<EventGroup>;
  listGroups(hotelId: string, status?: string): Promise<EventGroup[]>;
  getGroup(hotelId: string, groupId: string): Promise<EventGroup | null>;
  setGroupStatus(hotelId: string, groupId: string, status: string): Promise<void>;
  updateGroupRooms(hotelId: string, groupId: string, roomsAllocated: number): Promise<void>;

  // Salles
  createVenue(hotelId: string, input: CreateVenueInput): Promise<EventVenue>;
  listVenues(hotelId: string): Promise<EventVenue[]>;
  setVenueActive(hotelId: string, venueId: string, isActive: boolean): Promise<void>;

  // Équipements
  createEquipment(hotelId: string, input: CreateEquipmentInput): Promise<EventEquipment>;
  listEquipments(hotelId: string): Promise<EventEquipment[]>;

  // Événements
  createEvent(hotelId: string, input: CreateEventInput): Promise<HotelEvent>;
  listEvents(hotelId: string, status?: string, venueId?: string): Promise<HotelEvent[]>;
  getEvent(hotelId: string, eventId: string): Promise<HotelEvent | null>;
  setEventStatus(hotelId: string, eventId: string, status: string): Promise<void>;
  /** Calendrier : événements d'une salle sur une période. */
  calendar(hotelId: string, venueId?: string, from?: Date, to?: Date): Promise<HotelEvent[]>;
  /** Vérifie le conflit de salle sur une période. */
  venueAvailable(hotelId: string, venueId: string, from: Date, to: Date, excludeEventId?: string): Promise<boolean>;

  // Contrats / devis
  createContract(hotelId: string, input: CreateContractInput): Promise<EventContract>;
  listContracts(hotelId: string): Promise<EventContract[]>;
  setContractStatus(hotelId: string, contractId: string, status: string): Promise<void>;

  // Ordres de service
  createServiceOrder(hotelId: string, input: CreateServiceOrderInput): Promise<EventServiceOrder>;
  listServiceOrders(hotelId: string, department?: string): Promise<EventServiceOrder[]>;
  setServiceOrderStatus(hotelId: string, orderId: string, status: string): Promise<void>;

  // Documents
  addDocument(hotelId: string, input: { groupId?: string | null; eventId?: string | null; name: string; kind?: string; url?: string | null }): Promise<EventDocument>;
  listDocuments(hotelId: string): Promise<EventDocument[]>;
}
