/**
 * Conteneur de services (injection de dépendances) côté application.
 * Assemble le domaine (@afrihost/domain) avec les adapters d'infrastructure (Prisma,
 * EventBus partagé, audit). Chaque module y enregistre son service.
 *
 * Pattern : singletons par requête (pour éviter des états partagés entre requêtes),
 * simplifié ici en singletons globaux cohérents avec la fondation.
 */

import { eventBus, AuditLogger, EventBus } from "@afrihost/core";
import { SettingsService, HotelsService, ReservationsService, AuditService, GuestsService, RoomTypesService, RoomsService, StayService, FrontDeskService, HousekeepingService, MaintenanceService, LaundryService, TransportService, PosService, KitchenService, CashService, TipsService, DiscountsService, InventoryService, AccountingService, BillingService, CrmService, LoyaltyService, NotificationsService, AiService, ChannelService, PortalService, EventsService, BiService, AdminService, PublicApiService, MobileService, SaasService, SaasAdminService, BootstrapService, DevopsService, CertificationService } from "@afrihost/domain";
import { PrismaSettingsRepository } from "@/modules/settings/settings.repository.prisma";
import { PrismaHotelsRepository } from "@/modules/hotels/hotels.repository.prisma";
import { PrismaReservationsRepository } from "@/modules/reservations/reservations.repository.prisma";
import { PrismaAuditWriter, PrismaAuditReadRepository } from "@/modules/audit/audit.repository.prisma";
import { PrismaGuestsRepository } from "@/modules/guests/guests.repository.prisma";
import { PrismaRoomTypesRepository } from "@/modules/roomTypes/roomTypes.repository.prisma";
import { PrismaRoomsRepository } from "@/modules/rooms/rooms.repository.prisma";
import { PrismaStayRepository } from "@/modules/stay/stay.repository.prisma";
import { PrismaFrontDeskRepository } from "@/modules/frontdesk/frontdesk.repository.prisma";
import { PrismaHousekeepingRepository } from "@/modules/housekeeping/housekeeping.repository.prisma";
import { PrismaMaintenanceRepository } from "@/modules/maintenance/maintenance.repository.prisma";
import { PrismaLaundryRepository } from "@/modules/laundry/laundry.repository.prisma";
import { PrismaTransportRepository } from "@/modules/transport/transport.repository.prisma";
import { PrismaPosRepository } from "@/modules/pos/pos.repository.prisma";
import { PrismaKitchenRepository } from "@/modules/kitchen/kitchen.repository.prisma";
import { PrismaCashRepository } from "@/modules/cash/cash.repository.prisma";
import { PrismaTipsRepository } from "@/modules/tips/tips.repository.prisma";
import { PrismaDiscountsRepository } from "@/modules/discounts/discounts.repository.prisma";
import { PrismaInventoryRepository } from "@/modules/inventory/inventory.repository.prisma";
import { PrismaAccountingRepository } from "@/modules/accounting/accounting.repository.prisma";
import { PrismaBillingRepository } from "@/modules/billing/billing.repository.prisma";
import { PrismaCrmRepository } from "@/modules/crm/crm.repository.prisma";
import { PrismaLoyaltyRepository } from "@/modules/loyalty/loyalty.repository.prisma";
import { PrismaNotificationsRepository } from "@/modules/notifications/notifications.repository.prisma";
import { LoggerSender } from "@/modules/notifications/senders/logger.sender";
import { PrismaAiRepository } from "@/modules/ai/ai.repository.prisma";
import { LoggerLlm } from "@/modules/ai/llm/logger.llm";
import { PrismaChannelRepository } from "@/modules/channel/channel.repository.prisma";
import { LoggerConnector } from "@/modules/channel/connectors/logger.connector";
import { PrismaPortalRepository } from "@/modules/portal/portal.repository.prisma";
import { PrismaEventsRepository } from "@/modules/events/events.repository.prisma";
import { PrismaBiRepository } from "@/modules/bi/bi.repository.prisma";
import { PrismaAdminRepository } from "@/modules/admin/admin.repository.prisma";
import { PrismaPublicApiRepository } from "@/modules/publicapi/publicapi.repository.prisma";
import { PrismaMobileRepository } from "@/modules/mobile/mobile.repository.prisma";
import { PrismaSaasRepository } from "@/modules/saas/saas.repository.prisma";
import { LoggerPaymentGateway } from "@/modules/saas/gateways/logger.gateway";
import { PrismaSaasAdminRepository } from "@/modules/saasadmin/saasadmin.repository.prisma";
import { PrismaBootstrapRepository } from "@/modules/bootstrap/bootstrap.repository.prisma";
import { PrismaDevopsRepository } from "@/modules/devops/devops.repository.prisma";
import { PrismaCertificationRepository } from "@/modules/certification/certification.repository.prisma";

// Journal d'audit persistant (append-only en base).
export const auditLogger = new AuditLogger(new PrismaAuditWriter());

// Instance partagée de l'EventBus applicatif.
export const appBus: EventBus = eventBus;

// Services métier.
export const settingsService = new SettingsService(
  new PrismaSettingsRepository(),
  auditLogger,
  appBus,
);

export const hotelsService = new HotelsService(
  new PrismaHotelsRepository(),
  auditLogger,
  appBus,
);

export const reservationsService = new ReservationsService(
  new PrismaReservationsRepository(),
  auditLogger,
  appBus,
);

export const auditService = new AuditService(new PrismaAuditReadRepository());

export const guestsService = new GuestsService(
  new PrismaGuestsRepository(),
  auditLogger,
  appBus,
);

export const roomTypesService = new RoomTypesService(
  new PrismaRoomTypesRepository(),
  auditLogger,
  appBus,
);

export const roomsService = new RoomsService(
  new PrismaRoomsRepository(),
  auditLogger,
  appBus,
);

export const stayService = new StayService(
  new PrismaStayRepository(),
  auditLogger,
  appBus,
);

export const frontDeskService = new FrontDeskService(new PrismaFrontDeskRepository());

export const housekeepingService = new HousekeepingService(
  new PrismaHousekeepingRepository(),
  auditLogger,
  appBus,
);

export const maintenanceService = new MaintenanceService(
  new PrismaMaintenanceRepository(),
  auditLogger,
  appBus,
);

export const laundryService = new LaundryService(
  new PrismaLaundryRepository(),
  auditLogger,
  appBus,
);

export const transportService = new TransportService(
  new PrismaTransportRepository(),
  auditLogger,
  appBus,
);

export const posService = new PosService(
  new PrismaPosRepository(),
  auditLogger,
  appBus,
);

export const kitchenService = new KitchenService(
  new PrismaKitchenRepository(),
  auditLogger,
  appBus,
);

export const cashService = new CashService(
  new PrismaCashRepository(),
  auditLogger,
  appBus,
);

export const tipsService = new TipsService(
  new PrismaTipsRepository(),
  auditLogger,
  appBus,
);

export const discountsService = new DiscountsService(
  new PrismaDiscountsRepository(),
  auditLogger,
  appBus,
);

export const inventoryService = new InventoryService(
  new PrismaInventoryRepository(),
  auditLogger,
  appBus,
);

export const accountingService = new AccountingService(
  new PrismaAccountingRepository(),
  auditLogger,
  appBus,
);

export const billingService = new BillingService(
  new PrismaBillingRepository(),
  auditLogger,
  appBus,
);

export const crmService = new CrmService(
  new PrismaCrmRepository(),
  auditLogger,
  appBus,
);

export const loyaltyService = new LoyaltyService(
  new PrismaLoyaltyRepository(),
  auditLogger,
  appBus,
);

// Registre d'expéditeurs agnostique fournisseur : résolu par providerKey.
// En production on ajouterait ici les adaptateurs Resend/Twilio/Meta/FCM...
export const notificationSenders = {
  "logger-email": new LoggerSender("EMAIL"),
  "logger-sms": new LoggerSender("SMS"),
  "logger-whatsapp": new LoggerSender("WHATSAPP"),
  "logger-push": new LoggerSender("PUSH"),
};

export const notificationsService = new NotificationsService(
  new PrismaNotificationsRepository(),
  auditLogger,
  appBus,
  notificationSenders,
);

// Registre de clients LLM agnostique fournisseur : résolu par providerKey.
// En production on ajouterait les adaptateurs OpenAI/Anthropic/Gemini/Azure/Ollama...
export const aiLlmClients = {
  "logger-llm": new LoggerLlm("logger-llm"),
};

export const aiService = new AiService(
  new PrismaAiRepository(),
  auditLogger,
  appBus,
  aiLlmClients,
);

// Registre de connecteurs OTA (Connector Framework) : résolu par otaKey.
// En production on ajouterait Booking / Expedia / Airbnb / Agoda / Hotelbeds...
export const channelConnectors = {
  "booking-demo": new LoggerConnector("booking-demo", "Booking.com (démo)"),
  "expedia-demo": new LoggerConnector("expedia-demo", "Expedia (démo)"),
  "airbnb-demo": new LoggerConnector("airbnb-demo", "Airbnb (démo)"),
};

export const channelService = new ChannelService(
  new PrismaChannelRepository(),
  auditLogger,
  appBus,
  channelConnectors,
);

export const portalService = new PortalService(
  new PrismaPortalRepository(),
  auditLogger,
  appBus,
);

export const eventsService = new EventsService(
  new PrismaEventsRepository(),
  auditLogger,
  appBus,
);

export const biService = new BiService(
  new PrismaBiRepository(),
  auditLogger,
  appBus,
);

export const adminService = new AdminService(
  new PrismaAdminRepository(),
  auditLogger,
  appBus,
);

export const publicApiService = new PublicApiService(
  new PrismaPublicApiRepository(),
  auditLogger,
  appBus,
);

export const mobileService = new MobileService(
  new PrismaMobileRepository(),
  auditLogger,
  appBus,
);

// Registre de passerelles de paiement provider-agnostic (résolu par providerKey).
// En production : Stripe, Flutterwave, Paystack, CinetPay, FedaPay, PayPal, Lemon Squeezy, Paddle, Mobile Money...
export const saasPaymentGateways = {
  "stripe-demo": new LoggerPaymentGateway("stripe-demo", "Stripe (démo)"),
  "flutterwave-demo": new LoggerPaymentGateway("flutterwave-demo", "Flutterwave (démo)"),
  "paystack-demo": new LoggerPaymentGateway("paystack-demo", "Paystack (démo)"),
  "cinetpay-demo": new LoggerPaymentGateway("cinetpay-demo", "CinetPay (démo)"),
  "fedapay-demo": new LoggerPaymentGateway("fedapay-demo", "FedaPay (démo)"),
  "paypal-demo": new LoggerPaymentGateway("paypal-demo", "PayPal (démo)"),
};

export const saasService = new SaasService(
  new PrismaSaasRepository(),
  auditLogger,
  appBus,
  saasPaymentGateways,
);

export const saasAdminService = new SaasAdminService(
  new PrismaSaasAdminRepository(),
  auditLogger,
  appBus,
);

// Bootstrap & Initialisation du SaaS (Sous-module 33.1)
// La clé de bootstrap provient de l'environnement (jamais exposée publiquement).
export const bootstrapService = new BootstrapService(
  new PrismaBootstrapRepository(),
  auditLogger,
  appBus,
  process.env.BOOTSTRAP_KEY ?? "afrihost-bootstrap-dev-key",
);

export const devopsService = new DevopsService(
  new PrismaDevopsRepository(),
  auditLogger,
  appBus,
);

export const certificationService = new CertificationService(
  new PrismaCertificationRepository(),
  auditLogger,
  appBus,
);
