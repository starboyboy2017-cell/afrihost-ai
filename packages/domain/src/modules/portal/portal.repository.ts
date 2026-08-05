/**
 * Module 26 — Portail Client : port de persistance.
 *
 * Ce port donne accès aux données du client (réservations, factures, folios,
 * fidélité, séjours, préférences) — déjà filtrées par hôtel (RLS) côté adapter.
 */
import type {
  FolioSummary,
  InvoiceSummary,
  PortalDevice,
  PortalMessage,
  PortalNotification,
  PortalServiceRequest,
  PortalUser,
  RegisterPortalUserInput,
  ReservationSummary,
  StaySummary,
} from "./portal.types.js";

export interface PortalRepository {
  // Compte portail & authentification
  register(input: RegisterPortalUserInput): Promise<PortalUser>;
  findByEmailOrPhone(hotelId: string, identifier: string): Promise<PortalUser | null>;
  getByGuest(hotelId: string, guestId: string): Promise<PortalUser | null>;
  setPassword(hotelId: string, portalUserId: string, passwordHash: string): Promise<void>;
  setOtp(hotelId: string, portalUserId: string, otpHash: string, expiresAt: Date): Promise<void>;
  setLastLogin(hotelId: string, portalUserId: string): Promise<void>;
  isActive(hotelId: string, portalUserId: string): Promise<boolean>;

  // Appareils / sessions
  addDevice(hotelId: string, portalUserId: string, input: { deviceName?: string | null; platform?: string | null; token?: string | null }): Promise<PortalDevice>;
  listDevices(hotelId: string, portalUserId: string): Promise<PortalDevice[]>;
  revokeDevice(hotelId: string, deviceId: string): Promise<void>;

  // Profil & vue client
  updateGuestProfile(hotelId: string, guestId: string, input: { firstName?: string; lastName?: string; email?: string | null; phone?: string | null; nationality?: string | null; address?: string | null }): Promise<void>;
  getGuestName(hotelId: string, guestId: string): Promise<{ firstName: string; lastName: string; email?: string | null; phone?: string | null; loyaltyPoints: number; loyaltyTier: string | null } | null>;

  // Réservations (agrégées)
  listReservations(hotelId: string, guestId: string): Promise<ReservationSummary[]>;
  reservationOwnedByGuest(hotelId: string, reservationId: string, guestId: string): Promise<boolean>;
  setReservationStatus(hotelId: string, reservationId: string, status: string): Promise<void>;

  // Factures & folios
  listInvoices(hotelId: string, guestId: string): Promise<InvoiceSummary[]>;
  listFolios(hotelId: string, guestId: string): Promise<FolioSummary[]>;
  listStays(hotelId: string, guestId: string): Promise<StaySummary[]>;

  // Messages
  sendMessage(hotelId: string, portalUserId: string, guestId: string, input: { subject?: string | null; body: string }): Promise<PortalMessage>;
  listMessages(hotelId: string, portalUserId: string): Promise<PortalMessage[]>;
  markMessagesReadByGuest(hotelId: string, portalUserId: string): Promise<void>;
  countUnreadByGuest(hotelId: string, portalUserId: string): Promise<number>;

  // Demandes de service
  createServiceRequest(hotelId: string, portalUserId: string, guestId: string, input: { kind: string; title: string; detail?: string | null }): Promise<PortalServiceRequest>;
  listServiceRequests(hotelId: string, portalUserId: string): Promise<PortalServiceRequest[]>;

  // Notifications / offres
  listNotifications(hotelId: string, portalUserId: string): Promise<PortalNotification[]>;
  markNotificationsRead(hotelId: string, portalUserId: string): Promise<void>;
  countUnreadNotifications(hotelId: string, portalUserId: string): Promise<number>;
}
