/**
 * Module 26 — Portail Client : types du domaine.
 *
 * Espace client PWA, API-first (le même backend alimente web, Android/iOS et
 * futures apps partenaires). Synchronisé avec CRM, Réservations, Front Desk,
 * Paiements, Facturation, Fidélité, Notifications, Transport, POS, Housekeeping.
 */

/** Compte portail d'un client. */
export interface PortalUser {
  id: string;
  hotelId: string;
  guestId: string;
  email?: string | null;
  phone?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date | null;
  /** Champs d'authentification (interne au domaine, non exposés aux clients). */
  passwordHash?: string | null;
  otpHash?: string | null;
  otpExpiresAt?: Date | null;
}

/** Appareil connecté / session. */
export interface PortalDevice {
  id: string;
  portalUserId: string;
  hotelId: string;
  deviceName?: string | null;
  platform?: string | null;
  token?: string | null;
  lastSeenAt?: Date | null;
  isRevoked: boolean;
}

/** Message sécurisé. */
export interface PortalMessage {
  id: string;
  hotelId: string;
  portalUserId: string;
  guestId: string;
  direction: string;
  subject?: string | null;
  body: string;
  readByHotel: boolean;
  readByGuest: boolean;
}

/** Demande de service. */
export interface PortalServiceRequest {
  id: string;
  hotelId: string;
  portalUserId: string;
  guestId: string;
  kind: string;
  title: string;
  detail?: string | null;
  status: string;
}

/** Notification / offre. */
export interface PortalNotification {
  id: string;
  hotelId: string;
  portalUserId: string;
  guestId: string;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
}

/** Vue d'ensemble du portail client. */
export interface PortalDashboard {
  guestId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  loyaltyPoints: number;
  loyaltyTier: string | null;
  upcomingReservations: ReservationSummary[];
  pastReservations: ReservationSummary[];
  openFolios: number;
  unreadMessages: number;
  unreadNotifications: number;
  openServiceRequests: number;
}

/** Résumé d'une réservation visible par le client. */
export interface ReservationSummary {
  id: string;
  bookingRef: string;
  status: string;
  arrivalDate: Date;
  departureDate: Date;
  amount: number;
  currency: string;
  roomTypeName?: string | null;
}

/** Facture visible par le client. */
export interface InvoiceSummary {
  id: string;
  number?: string | null;
  status: string;
  total: number;
  currency: string;
  issuedAt?: Date | null;
}

/** Folio visible par le client. */
export interface FolioSummary {
  id: string;
  status: string;
  balance: number;
  currency: string;
}

/** Séjour / consommation visible par le client. */
export interface StaySummary {
  id: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  status: string;
  roomName?: string | null;
  charges: number;
  currency: string;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface RegisterPortalUserInput {
  hotelId: string;
  guestId: string;
  email?: string | null;
  phone?: string | null;
  password?: string | null; // optionnel si OTP/OAuth
}

export interface LoginInput {
  identifier: string; // email ou téléphone
  password?: string | null;
  otp?: string | null;
  deviceName?: string | null;
  platform?: string | null;
}

export interface RequestOtpInput {
  identifier: string;
  channel: "email" | "sms";
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  address?: string | null;
}

export interface SendMessageInput {
  subject?: string | null;
  body: string;
}

export interface CreateServiceRequestInput {
  kind: string;
  title: string;
  detail?: string | null;
}

export interface ChangeReservationInput {
  reservationId: string;
  action: "modify" | "cancel";
  newArrivalDate?: string | null;
  newDepartureDate?: string | null;
}

export interface SubmitPaymentInput {
  reservationId?: string | null;
  folioId?: string | null;
  amount: number;
  currency: string;
  method: string; // card, mobile_money, bank
}

export interface OnlineCheckinInput {
  reservationId: string;
  idDocument?: string | null;
  idDocumentType?: string | null;
  vehiclePlate?: string | null;
  notes?: string | null;
}
