/**
 * Module 27 — Événements & Groupes : types du domaine.
 */

/** Groupe de réservation. */
export interface EventGroup {
  id: string;
  hotelId: string;
  companyId?: string | null;
  name: string;
  type: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  roomsAllocated: number;
  totalRooms: number;
  arrivalDate?: Date | null;
  departureDate?: Date | null;
  status: string;
  notes?: string | null;
}

/** Salle / espace événementiel. */
export interface EventVenue {
  id: string;
  hotelId: string;
  name: string;
  capacity: number;
  seatingModes?: Record<string, unknown> | null;
  basePrice: number;
  currency: string;
  isActive: boolean;
}

/** Équipement. */
export interface EventEquipment {
  id: string;
  hotelId: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  isActive: boolean;
}

/** Événement / séminaire / banquet. */
export interface HotelEvent {
  id: string;
  hotelId: string;
  groupId?: string | null;
  venueId?: string | null;
  name: string;
  eventType: string;
  startAt?: Date | null;
  endAt?: Date | null;
  expectedAttendees: number;
  status: string;
  notes?: string | null;
}

/** Contrat / devis. */
export interface EventContract {
  id: string;
  hotelId: string;
  groupId?: string | null;
  eventId?: string | null;
  title: string;
  contractType: string;
  amount: number;
  currency: string;
  status: string;
  validUntil?: Date | null;
  signedAt?: Date | null;
}

/** Ordre de service. */
export interface EventServiceOrder {
  id: string;
  hotelId: string;
  groupId?: string | null;
  eventId?: string | null;
  department: string;
  title: string;
  detail?: string | null;
  status: string;
  dueAt?: Date | null;
}

/** Document. */
export interface EventDocument {
  id: string;
  hotelId: string;
  groupId?: string | null;
  eventId?: string | null;
  name: string;
  kind: string;
  url?: string | null;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateGroupInput {
  companyId?: string | null;
  name: string;
  type?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  totalRooms?: number;
  arrivalDate?: Date | string | null;
  departureDate?: Date | string | null;
  notes?: string | null;
}

export interface CreateVenueInput {
  name: string;
  capacity?: number;
  seatingModes?: Record<string, unknown>;
  basePrice?: number;
  currency?: string;
}

export interface CreateEquipmentInput {
  name: string;
  category?: string;
  quantity?: number;
}

export interface CreateEventInput {
  groupId?: string | null;
  venueId?: string | null;
  name: string;
  eventType?: string;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  expectedAttendees?: number;
  notes?: string | null;
}

export interface CreateContractInput {
  groupId?: string | null;
  eventId?: string | null;
  title: string;
  contractType?: string;
  amount?: number;
  currency?: string;
  validUntil?: Date | string | null;
}

export interface CreateServiceOrderInput {
  groupId?: string | null;
  eventId?: string | null;
  department: string;
  title: string;
  detail?: string | null;
  dueAt?: Date | string | null;
}
