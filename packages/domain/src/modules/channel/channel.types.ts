/**
 * Module 25 — Channel Manager / OTA : types du domaine.
 *
 * Moteur de connecteurs générique (**Connector Framework**) : chaque OTA
 * (Booking.com, Expedia, Airbnb, Agoda, Hotelbeds...) est implémenté comme un
 * connecteur indépendant. L'application ne connaît jamais une plateforme
 * concrète : elle travaille avec des comptes, des mappings, des jobs et des
 * logs. Provider-agnostic.
 */

/** Sens d'un job de synchronisation. */
export type SyncDirection = "outbound" | "inbound";
/** Type de job. */
export type SyncType = "availability" | "rates" | "restrictions" | "booking" | "cancellation" | "mapping";
/** Statut d'un job. */
export type SyncJobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "RETRYING";

/** Compte OTA configurable par hôtel. */
export interface ChannelAccount {
  id: string;
  hotelId: string;
  otaKey: string;
  name: string;
  credentials?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  isActive: boolean;
  lastSyncAt?: Date | null;
  lastError?: string | null;
}

/** Mapping chambre PMS ↔ chambre OTA. */
export interface ChannelRoomMapping {
  id: string;
  accountId: string;
  hotelId: string;
  roomTypeId: string;
  otaRoomId: string;
  otaRoomName?: string | null;
  isActive: boolean;
}

/** Job de synchronisation. */
export interface ChannelSyncJob {
  id: string;
  accountId: string;
  hotelId: string;
  direction: SyncDirection;
  type: SyncType;
  status: SyncJobStatus;
  attempts: number;
  maxAttempts: number;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  nextRetryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Log de synchronisation. */
export interface ChannelSyncLog {
  id: string;
  accountId: string;
  hotelId: string;
  jobId?: string | null;
  level: string;
  message: string;
  detail?: Record<string, unknown> | null;
  createdAt: Date;
}

/** Surcharge de tarif. */
export interface ChannelRateOverride {
  id: string;
  accountId: string;
  hotelId: string;
  roomTypeId: string;
  ratePlanId?: string | null;
  date: Date;
  price: number;
  currency: string;
  status: string;
  syncedAt?: Date | null;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateChannelAccountInput {
  otaKey: string;
  name: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface CreateMappingInput {
  accountId: string;
  roomTypeId: string;
  otaRoomId: string;
  otaRoomName?: string | null;
}

/** Données poussées vers l'OTA (outbound). */
export interface AvailabilityUpdate {
  date: string; // YYYY-MM-DD
  rooms: number; // nombre de chambres à vendre
}

export interface RateUpdate {
  date: string;
  roomTypeId: string;
  ratePlanId?: string | null;
  price: number;
  currency?: string;
}

export interface RestrictionUpdate {
  date: string;
  roomTypeId: string;
  minStay?: number | null;
  maxStay?: number | null;
  closedToArrival?: boolean | null;
  closedToDeparture?: boolean | null;
  stopSell?: boolean | null;
}

/** Réservation reçue d'une OTA (inbound). */
export interface InboundBooking {
  otaKey: string;
  otaBookingId: string;
  guestName: string;
  guestEmail?: string | null;
  roomTypeId: string; // type de chambre PMS (déjà mappé)
  arrivalDate: string;
  departureDate: string;
  adults?: number;
  children?: number;
  amount?: number;
  currency?: string;
  status?: string; // confirmed | cancelled
}

export interface PushAvailabilityInput {
  accountId: string;
  updates: AvailabilityUpdate[];
}
export interface PushRatesInput {
  accountId: string;
  updates: RateUpdate[];
}
export interface PushRestrictionsInput {
  accountId: string;
  updates: RestrictionUpdate[];
}
export interface ProcessBookingInput {
  accountId: string;
  booking: InboundBooking;
}
