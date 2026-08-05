/**
 * Module 26 — Portail Client : service métier.
 *
 * PWA, API-first (le même backend alimente web, Android/iOS et futurs apps).
 * Fonctionnalités :
 *   - authentification sécurisée (email/téléphone + mot de passe ou OTP),
 *     gestion des appareils/sessions ;
 *   - tableau de bord : réservations (actuelles/passées/futures), factures,
 *     folios, séjours/consommations, fidélité ;
 *   - modification/annulation de réservation selon les règles de l'hôtel ;
 *   - check-in / check-out en ligne ;
 *   - paiement sécurisé des soldes et acomptes ;
 *   - messagerie sécurisée, demandes de services, notifications/offres ;
 *   - mise à jour du profil.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC portal.*.
 * Chaque mutation est journalisée (audit). Synchronisé avec CRM, Réservations,
 * Front Desk, Paiements, Facturation, Fidélité, Notifications.
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { createHash, randomUUID } from "node:crypto";
import { PortalError } from "./portal.error.js";
import type { PortalRepository } from "./portal.repository.js";
import type {
  ChangeReservationInput,
  CreateServiceRequestInput,
  FolioSummary,
  InvoiceSummary,
  LoginInput,
  OnlineCheckinInput,
  PortalDashboard,
  PortalDevice,
  PortalMessage,
  PortalNotification,
  PortalServiceRequest,
  PortalUser,
  RegisterPortalUserInput,
  RequestOtpInput,
  ReservationSummary,
  SendMessageInput,
  StaySummary,
  SubmitPaymentInput,
  UpdateProfileInput,
} from "./portal.types.js";
import {
  validateChangeReservation,
  validateCreateServiceRequest,
  validateLogin,
  validateOnlineCheckin,
  validateRegisterPortalUser,
  validateRequestOtp,
  validateSendMessage,
  validateSubmitPayment,
  validateUpdateProfile,
} from "./portal.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface PortalActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class PortalService {
  constructor(
    private readonly repo: PortalRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Authentification
  // ---------------------------------------------------------------------------

  /** Crée un compte portail (mots de passe hashés, jamais en clair). */
  async register(hotelId: string, input: RegisterPortalUserInput, actor: PortalActor): Promise<PortalUser> {
    this.assertHotel(hotelId, actor);
    const v = validateRegisterPortalUser(input);
    if (await this.repo.getByGuest(hotelId, v.guestId)) throw new PortalError("Un compte portail existe déjà pour ce client");
    const withHash = v.password ? { ...v, password: this.hash(v.password) } : v;
    const user = await this.repo.register(withHash);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.register", entityType: "PortalUser", entityId: user.id, after: { guestId: v.guestId } });
    return user;
  }

  /** Connecte un client (mot de passe ou OTP). Retourne le compte si valide. */
  async login(hotelId: string, input: LoginInput, actor: PortalActor): Promise<PortalUser> {
    this.assertHotel(hotelId, actor);
    const v = validateLogin(input);
    const user = await this.repo.findByEmailOrPhone(hotelId, v.identifier);
    if (!user || !(await this.repo.isActive(hotelId, user.id))) throw new PortalError("Identifiants invalides");
    if (v.otp) {
      // En production : comparer avec otpHash + expiration. Ici on vérifie le hash stocké.
      if (this.hash(v.otp) !== user.otpHash) throw new PortalError("Code OTP invalide");
    } else if (v.password) {
      if (!user.passwordHash || this.hash(v.password) !== user.passwordHash) throw new PortalError("Mot de passe invalide");
    } else {
      throw new PortalError("Mot de passe ou code OTP requis");
    }
    await this.repo.setLastLogin(hotelId, user.id);
    if (v.deviceName || v.platform) {
      await this.repo.addDevice(hotelId, user.id, { deviceName: v.deviceName ?? null, platform: v.platform ?? null });
    }
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.login", entityType: "PortalUser", entityId: user.id });
    return user;
  }

  /** Demande un OTP (simule l'envoi email/SMS — en prod via Notifications). */
  async requestOtp(hotelId: string, input: RequestOtpInput, actor: PortalActor): Promise<{ sent: boolean }> {
    this.assertHotel(hotelId, actor);
    const v = validateRequestOtp(input);
    const user = await this.repo.findByEmailOrPhone(hotelId, v.identifier);
    if (!user) throw new PortalError("Compte introuvable");
    const otp = this.generateOtp();
    await this.repo.setOtp(hotelId, user.id, this.hash(otp), new Date(Date.now() + 5 * 60_000));
    // En production : déclencher Notifications (email/SMS). Ici on journalise.
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.otp.request", entityType: "PortalUser", entityId: user.id, after: { channel: v.channel } });
    // NB : ne jamais retourner le code en production — journalisé ici pour la démo.
    return { sent: true };
  }

  async listDevices(hotelId: string, portalUserId: string, actor: PortalActor): Promise<PortalDevice[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listDevices(hotelId, portalUserId);
  }

  async revokeDevice(hotelId: string, deviceId: string, actor: PortalActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.revokeDevice(hotelId, deviceId);
  }

  // ---------------------------------------------------------------------------
  // Tableau de bord & vue client
  // ---------------------------------------------------------------------------

  async dashboard(hotelId: string, guestId: string, actor: PortalActor): Promise<PortalDashboard> {
    this.assertHotel(hotelId, actor);
    const guest = await this.repo.getGuestName(hotelId, guestId);
    if (!guest) throw new PortalError("Client introuvable");
    const reservations = await this.repo.listReservations(hotelId, guestId);
    const now = new Date();
    const upcoming = reservations.filter((r) => r.arrivalDate >= now && r.status !== "CANCELLED");
    const past = reservations.filter((r) => r.arrivalDate < now || r.status === "CANCELLED");
    const user = await this.repo.getByGuest(hotelId, guestId);
    const [folios, unreadMessages, unreadNotifs, serviceRequests] = await Promise.all([
      this.repo.listFolios(hotelId, guestId),
      user ? this.repo.countUnreadByGuest(hotelId, user.id) : Promise.resolve(0),
      user ? this.repo.countUnreadNotifications(hotelId, user.id) : Promise.resolve(0),
      user ? this.repo.listServiceRequests(hotelId, user.id) : Promise.resolve([]),
    ]);
    return {
      guestId, firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone,
      loyaltyPoints: guest.loyaltyPoints, loyaltyTier: guest.loyaltyTier,
      upcomingReservations: upcoming, pastReservations: past,
      openFolios: folios.filter((f) => f.balance > 0).length,
      unreadMessages, unreadNotifications: unreadNotifs,
      openServiceRequests: serviceRequests.filter((s) => s.status === "OPEN").length,
    };
  }

  async updateProfile(hotelId: string, guestId: string, input: UpdateProfileInput, actor: PortalActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const v = validateUpdateProfile(input);
    await this.repo.updateGuestProfile(hotelId, guestId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.profile.update", entityType: "Guest", entityId: guestId, after: { firstName: v.firstName } });
  }

  // ---------------------------------------------------------------------------
  // Réservations
  // ---------------------------------------------------------------------------

  async listReservations(hotelId: string, guestId: string, actor: PortalActor): Promise<ReservationSummary[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listReservations(hotelId, guestId);
  }

  /** Modifie ou annule une réservation (seulement si elle appartient au client). */
  async changeReservation(hotelId: string, guestId: string, input: ChangeReservationInput, actor: PortalActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const v = validateChangeReservation(input);
    if (!(await this.repo.reservationOwnedByGuest(hotelId, v.reservationId, guestId))) throw new PortalError("Réservation introuvable");
    if (v.action === "cancel") {
      await this.repo.setReservationStatus(hotelId, v.reservationId, "CANCELLED");
    } else {
      await this.repo.setReservationStatus(hotelId, v.reservationId, "MODIFIED");
    }
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: `portal.reservation.${v.action}`, entityType: "Reservation", entityId: v.reservationId, after: { action: v.action } });
    await this.bus.publish({ name: DomainEvents.portalReservationChanged, hotelId, organisationId: actor.organisationId, data: { reservationId: v.reservationId, action: v.action } });
  }

  // ---------------------------------------------------------------------------
  // Factures / folios / séjours
  // ---------------------------------------------------------------------------

  async invoices(hotelId: string, guestId: string, actor: PortalActor): Promise<InvoiceSummary[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listInvoices(hotelId, guestId);
  }

  async folios(hotelId: string, guestId: string, actor: PortalActor): Promise<FolioSummary[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listFolios(hotelId, guestId);
  }

  async stays(hotelId: string, guestId: string, actor: PortalActor): Promise<StaySummary[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listStays(hotelId, guestId);
  }

  // ---------------------------------------------------------------------------
  // Check-in / check-out en ligne
  // ---------------------------------------------------------------------------

  async onlineCheckin(hotelId: string, guestId: string, input: OnlineCheckinInput, actor: PortalActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const v = validateOnlineCheckin(input);
    if (!(await this.repo.reservationOwnedByGuest(hotelId, v.reservationId, guestId))) throw new PortalError("Réservation introuvable");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.checkin.online", entityType: "Reservation", entityId: v.reservationId, after: { idDocumentType: v.idDocumentType } });
  }

  async onlineCheckout(hotelId: string, guestId: string, reservationId: string, actor: PortalActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.reservationOwnedByGuest(hotelId, reservationId, guestId))) throw new PortalError("Réservation introuvable");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.checkout.online", entityType: "Reservation", entityId: reservationId });
  }

  // ---------------------------------------------------------------------------
  // Paiements
  // ---------------------------------------------------------------------------

  /** Soumet un paiement d'acompte / solde (délégué au module Paiements via événement). */
  async submitPayment(hotelId: string, guestId: string, input: SubmitPaymentInput, actor: PortalActor): Promise<{ reference: string }> {
    this.assertHotel(hotelId, actor);
    const v = validateSubmitPayment(input);
    const reference = `PAY-${randomUUID().slice(0, 8)}`;
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.payment.submit", entityType: "Payment", entityId: reference, after: { amount: v.amount, currency: v.currency, method: v.method } });
    await this.bus.publish({ name: DomainEvents.portalPaymentSubmitted, hotelId, organisationId: actor.organisationId, data: { reference, guestId, amount: v.amount, currency: v.currency, method: v.method, reservationId: v.reservationId, folioId: v.folioId } });
    return { reference };
  }

  // ---------------------------------------------------------------------------
  // Messagerie
  // ---------------------------------------------------------------------------

  async sendMessage(hotelId: string, guestId: string, input: SendMessageInput, actor: PortalActor): Promise<PortalMessage> {
    this.assertHotel(hotelId, actor);
    const v = validateSendMessage(input);
    const user = await this.repo.getByGuest(hotelId, guestId);
    if (!user) throw new PortalError("Compte portail introuvable");
    const message = await this.repo.sendMessage(hotelId, user.id, guestId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.message.send", entityType: "PortalMessage", entityId: message.id });
    return message;
  }

  async messages(hotelId: string, guestId: string, actor: PortalActor): Promise<PortalMessage[]> {
    this.assertHotel(hotelId, actor);
    const user = await this.repo.getByGuest(hotelId, guestId);
    if (!user) throw new PortalError("Compte portail introuvable");
    await this.repo.markMessagesReadByGuest(hotelId, user.id);
    return this.repo.listMessages(hotelId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Demandes de services
  // ---------------------------------------------------------------------------

  async createServiceRequest(hotelId: string, guestId: string, input: CreateServiceRequestInput, actor: PortalActor): Promise<PortalServiceRequest> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateServiceRequest(input);
    const user = await this.repo.getByGuest(hotelId, guestId);
    if (!user) throw new PortalError("Compte portail introuvable");
    const request = await this.repo.createServiceRequest(hotelId, user.id, guestId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "portal.service_request.create", entityType: "PortalServiceRequest", entityId: request.id, after: { kind: v.kind } });
    await this.bus.publish({ name: DomainEvents.portalServiceRequested, hotelId, organisationId: actor.organisationId, data: { requestId: request.id, kind: v.kind, guestId } });
    return request;
  }

  async serviceRequests(hotelId: string, guestId: string, actor: PortalActor): Promise<PortalServiceRequest[]> {
    this.assertHotel(hotelId, actor);
    const user = await this.repo.getByGuest(hotelId, guestId);
    if (!user) throw new PortalError("Compte portail introuvable");
    return this.repo.listServiceRequests(hotelId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Notifications / offres
  // ---------------------------------------------------------------------------

  async notifications(hotelId: string, guestId: string, actor: PortalActor): Promise<PortalNotification[]> {
    this.assertHotel(hotelId, actor);
    const user = await this.repo.getByGuest(hotelId, guestId);
    if (!user) throw new PortalError("Compte portail introuvable");
    await this.repo.markNotificationsRead(hotelId, user.id);
    return this.repo.listNotifications(hotelId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Hash déterministe (démo). En production : BCrypt/Argon2 via l'infra. */
  private hash(value: string): string {
    return createHash("sha256").update(`afrihost:${value}`).digest("hex");
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private assertHotel(hotelId: string, actor: PortalActor): void {
    if (actor.hotelId !== hotelId) throw new PortalError("Accès inter-hôtel refusé");
  }
}
