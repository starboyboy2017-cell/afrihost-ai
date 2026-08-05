/**
 * Catalogue central des événements de domaine (ADR-006).
 * Chaque module émet/écoute les événements ci-dessous. C'est la source de vérité pour
 * les noms d'événements — éviter les chaînes magiques éparpillées dans le code.
 */

export const DomainEvents = {
  // Réservations
  reservationCreated: "reservation.created",
  reservationConfirmed: "reservation.confirmed",
  reservationCancelled: "reservation.cancelled",
  reservationNoShow: "reservation.no_show",

  // Chambres / états
  roomStatusChanged: "room.status_changed",

  // Front desk
  guestCheckedIn: "guest.checked_in",
  guestCheckedOut: "guest.checked_out",

  // Housekeeping
  housekeepingTaskCreated: "housekeeping.task_created",
  housekeepingCompleted: "housekeeping.completed",

  // Paiements / facturation
  paymentReceived: "payment.received",
  invoicePaid: "invoice.paid",

  // Multihôtel / organisation
  hotelCreated: "hotel.created",
  hotelUpdated: "hotel.updated",
  settingsChanged: "settings.changed",

  // Fidélité / CRM (Module 22)
  loyaltyPointsEarned: "loyalty.points_earned",
  loyaltyPointsRedeemed: "loyalty.points_redeemed",
  loyaltyTierChanged: "loyalty.tier_changed",
  loyaltyMemberEnrolled: "loyalty.member_enrolled",
  loyaltyProgramCreated: "loyalty.program_created",
  loyaltyNotificationCreated: "loyalty.notification_created",

  // Notifications multicanales (Module 23)
  notificationEnqueued: "notifications.enqueued",
  notificationEventDispatch: "notifications.event_dispatch",

  // Channel Manager / OTA (Module 25)
  channelJobEnqueued: "channel.job_enqueued",
  channelSynced: "channel.synced",
  channelBookingReceived: "channel.booking_received",

  // Portail Client (Module 26)
  portalReservationChanged: "portal.reservation_changed",
  portalPaymentSubmitted: "portal.payment_submitted",
  portalServiceRequested: "portal.service_requested",
  portalMessageSent: "portal.message_sent",

  // Événements & Groupes (Module 27)
  eventGroupCreated: "events.group_created",
  eventCreated: "events.event_created",
  eventServiceOrderCreated: "events.service_order_created",

  // Plateforme Mobile (Module 31)
  mobileDeviceRegistered: "mobile.device_registered",
  mobileSynced: "mobile.synced",
  mobilePushSent: "mobile.push_sent",

  // Billing SaaS & Abonnements (Module 32)
  saasSubscriptionCreated: "saas.subscription_created",
  saasSubscriptionRenewed: "saas.subscription_renewed",
  saasSubscriptionSuspended: "saas.subscription_suspended",
  saasPaymentReceived: "saas.payment_received",
  saasPaymentValidated: "saas.payment_validated",
  saasInvoiceAvailable: "saas.invoice_available",

  // Super Administration — SaaS Control Center (Module 33)
  saasHotelChanged: "saas.hotel_changed",
  saasImpersonationStarted: "saas.impersonation_started",
  saasBackupCreated: "saas.backup_created",
  saasMonitoringAlert: "saas.monitoring_alert",

  // Bootstrap & Initialisation du SaaS (Sous-module 33.1)
  bootstrapSuperAdminCreated: "bootstrap.super_admin_created",

  // Production Readiness, DevOps & Sécurité Entreprise (Module 34)
  devopsHealthAlert: "devops.health_alert",
  devopsSecurityAlert: "devops.security_alert",
  devopsSecretRotated: "devops.secret_rotated",

  // POS (restaurant)
  posSaleCompleted: "pos.sale_completed",

  // Distribution (futur)
  channelReservationSynced: "channel.reservation_synced",
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];
