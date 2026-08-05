/**
 * @afrihost/domain — Modules métier (domaine) d'AfriHost AI.
 * Chaque module expose services, types et règles, testables indépendamment de l'infra.
 */

// Module 1 — Paramètres généraux
export * from "./modules/settings/settings.types.js";
export * from "./modules/settings/settings.validation.js";
export * from "./modules/settings/settings.repository.js";
export * from "./modules/settings/settings.service.js";

// Module 2 — Gestion multihôtels
export * from "./modules/hotels/hotels.types.js";
export * from "./modules/hotels/hotels.validation.js";
export * from "./modules/hotels/hotels.repository.js";
export * from "./modules/hotels/hotels.service.js";
export * from "./modules/hotels/hotels.error.js";

// Module 3 — Gestion des réservations
export * from "./modules/reservations/reservations.types.js";
export * from "./modules/reservations/reservations.state.js";
export * from "./modules/reservations/reservations.validation.js";
export * from "./modules/reservations/reservations.pricing.js";
export * from "./modules/reservations/reservations.repository.js";
export * from "./modules/reservations/reservations.service.js";
export * from "./modules/reservations/reservations.error.js";

// Module 4 — Journal d'audit (consultation)
export * from "./modules/audit/audit.types.js";
export * from "./modules/audit/audit.repository.js";
export * from "./modules/audit/audit.service.js";

// Module Guests — Clients
export * from "./modules/guests/guests.types.js";
export * from "./modules/guests/guests.repository.js";
export * from "./modules/guests/guests.validation.js";
export * from "./modules/guests/guests.service.js";
export * from "./modules/guests/guests.error.js";

// Module 5 — Types de chambres & tarifs
export * from "./modules/roomTypes/roomTypes.types.js";
export * from "./modules/roomTypes/roomTypes.validation.js";
export * from "./modules/roomTypes/roomTypes.repository.js";
export * from "./modules/roomTypes/roomTypes.service.js";
export * from "./modules/roomTypes/roomTypes.error.js";

// Module 6 — Chambres & inventaire physique
export * from "./modules/rooms/rooms.types.js";
export * from "./modules/rooms/rooms.state.js";
export * from "./modules/rooms/rooms.validation.js";
export * from "./modules/rooms/rooms.repository.js";
export * from "./modules/rooms/rooms.service.js";
export * from "./modules/rooms/rooms.error.js";

// RoomStatus est défini dans rooms.types et frontdesk.types — ré-exporter explicitement
// depuis frontdesk (les deux sont structurellement identiques).

// Module 7 — Check-in / Check-out (séjours)
export * from "./modules/stay/stay.types.js";
export * from "./modules/stay/stay.validation.js";
export * from "./modules/stay/stay.repository.js";
export * from "./modules/stay/stay.service.js";
export * from "./modules/stay/stay.error.js";

// Module 8 — Tableau de disponibilité (Front Desk)
export * from "./modules/frontdesk/frontdesk.types.js";
export * from "./modules/frontdesk/frontdesk.repository.js";
export * from "./modules/frontdesk/frontdesk.service.js";

// Module 9 — Housekeeping
export * from "./modules/housekeeping/housekeeping.types.js";
export * from "./modules/housekeeping/housekeeping.state.js";
export * from "./modules/housekeeping/housekeeping.validation.js";
export * from "./modules/housekeeping/housekeeping.repository.js";
export * from "./modules/housekeeping/housekeeping.service.js";
export * from "./modules/housekeeping/housekeeping.error.js";

// Module 10 — Maintenance & interventions
export * from "./modules/maintenance/maintenance.types.js";
export * from "./modules/maintenance/maintenance.state.js";
export * from "./modules/maintenance/maintenance.validation.js";
export * from "./modules/maintenance/maintenance.repository.js";
export * from "./modules/maintenance/maintenance.service.js";
export * from "./modules/maintenance/maintenance.error.js";

// Module 11 — Blanchisserie
export * from "./modules/laundry/laundry.types.js";
export * from "./modules/laundry/laundry.state.js";
export * from "./modules/laundry/laundry.validation.js";
export * from "./modules/laundry/laundry.repository.js";
export * from "./modules/laundry/laundry.service.js";
export * from "./modules/laundry/laundry.error.js";

// Module 12 — Transport, navettes & transferts
export * from "./modules/transport/transport.types.js";
export * from "./modules/transport/transport.state.js";
export * from "./modules/transport/transport.validation.js";
export * from "./modules/transport/transport.repository.js";
export * from "./modules/transport/transport.service.js";
export * from "./modules/transport/transport.error.js";

// Module 13 — POS Restaurant
export * from "./modules/pos/pos.types.js";
export * from "./modules/pos/pos.state.js";
export * from "./modules/pos/pos.validation.js";
export * from "./modules/pos/pos.repository.js";
export * from "./modules/pos/pos.service.js";
export * from "./modules/pos/pos.error.js";

// Module 14 — Cuisine (Kitchen Display System)
export * from "./modules/kitchen/kitchen.types.js";
export * from "./modules/kitchen/kitchen.state.js";
export * from "./modules/kitchen/kitchen.validation.js";
export * from "./modules/kitchen/kitchen.repository.js";
export * from "./modules/kitchen/kitchen.service.js";
export * from "./modules/kitchen/kitchen.error.js";

// Module 15 — Caisse
export * from "./modules/cash/cash.types.js";
export * from "./modules/cash/cash.validation.js";
export * from "./modules/cash/cash.repository.js";
export * from "./modules/cash/cash.service.js";
export * from "./modules/cash/cash.error.js";

// Module 16 — Pourboires
export * from "./modules/tips/tips.types.js";
export * from "./modules/tips/tips.validation.js";
export * from "./modules/tips/tips.repository.js";
export * from "./modules/tips/tips.service.js";
export * from "./modules/tips/tips.error.js";

// Module 17 — Remises, promotions & coupons
export * from "./modules/discounts/discounts.types.js";
export * from "./modules/discounts/discounts.validation.js";
export * from "./modules/discounts/discounts.repository.js";
export * from "./modules/discounts/discounts.service.js";
export * from "./modules/discounts/discounts.error.js";

// Module 18 — Stock & inventaire
export * from "./modules/inventory/inventory.types.js";
export * from "./modules/inventory/inventory.validation.js";
export * from "./modules/inventory/inventory.repository.js";
export * from "./modules/inventory/inventory.service.js";
export * from "./modules/inventory/inventory.error.js";

// Module 19 — Comptabilité générale
export * from "./modules/accounting/accounting.types.js";
export * from "./modules/accounting/accounting.validation.js";
export * from "./modules/accounting/accounting.repository.js";
export * from "./modules/accounting/accounting.service.js";
export * from "./modules/accounting/accounting.error.js";

// Module 20 — Paiements & facturation (folios clients)
export * from "./modules/billing/billing.types.js";
export * from "./modules/billing/billing.validation.js";
export * from "./modules/billing/billing.repository.js";
export * from "./modules/billing/billing.service.js";
export * from "./modules/billing/billing.error.js";

// Module 21 — CRM
export * from "./modules/crm/crm.types.js";
export * from "./modules/crm/crm.validation.js";
export * from "./modules/crm/crm.repository.js";
export * from "./modules/crm/crm.service.js";
export * from "./modules/crm/crm.error.js";

// Module 22 — Programme de fidélité
export * from "./modules/loyalty/loyalty.types.js";
export * from "./modules/loyalty/loyalty.validation.js";
export * from "./modules/loyalty/loyalty.repository.js";
export * from "./modules/loyalty/loyalty.rule-engine.js";
export * from "./modules/loyalty/loyalty.service.js";
export * from "./modules/loyalty/loyalty.error.js";

// Module 23 — Notifications multicanales
export * from "./modules/notifications/notifications.types.js";
export * from "./modules/notifications/notifications.validation.js";
export * from "./modules/notifications/notifications.repository.js";
export * from "./modules/notifications/notifications.template-engine.js";
export * from "./modules/notifications/notifications.sender.js";
export * from "./modules/notifications/notifications.service.js";
export * from "./modules/notifications/notifications.error.js";

// Module 24 — IA (assistant, prédictions, automatisation)
export * from "./modules/ai/ai.types.js";
export * from "./modules/ai/ai.validation.js";
export * from "./modules/ai/ai.repository.js";
export * from "./modules/ai/ai.llm.js";
export * from "./modules/ai/ai.analytics.js";
export * from "./modules/ai/ai.service.js";
export * from "./modules/ai/ai.error.js";

// Module 25 — Channel Manager / OTA
export * from "./modules/channel/channel.types.js";
export * from "./modules/channel/channel.validation.js";
export * from "./modules/channel/channel.repository.js";
export * from "./modules/channel/channel.connector.js";
export * from "./modules/channel/channel.service.js";
export * from "./modules/channel/channel.error.js";

// Module 26 — Portail Client
export * from "./modules/portal/portal.types.js";
export * from "./modules/portal/portal.validation.js";
export * from "./modules/portal/portal.repository.js";
export * from "./modules/portal/portal.service.js";
export * from "./modules/portal/portal.error.js";

// Module 27 — Événements & Groupes
export * from "./modules/events/events.types.js";
export * from "./modules/events/events.validation.js";
export * from "./modules/events/events.repository.js";
export * from "./modules/events/events.service.js";
export * from "./modules/events/events.error.js";

// Module 28 — Reporting & Business Intelligence
export * from "./modules/bi/bi.types.js";
export * from "./modules/bi/bi.validation.js";
export * from "./modules/bi/bi.repository.js";
export * from "./modules/bi/bi.kpi-engine.js";
export * from "./modules/bi/bi.service.js";
export * from "./modules/bi/bi.error.js";

// Module 29 — Administration & Paramétrage Global
export * from "./modules/admin/admin.types.js";
export * from "./modules/admin/admin.validation.js";
export * from "./modules/admin/admin.repository.js";
export * from "./modules/admin/admin.catalogs.js";
export * from "./modules/admin/admin.service.js";
export * from "./modules/admin/admin.error.js";

// Module 30 — API Publique & Marketplace
export * from "./modules/publicapi/publicapi.types.js";
export * from "./modules/publicapi/publicapi.validation.js";
export * from "./modules/publicapi/publicapi.repository.js";
export * from "./modules/publicapi/publicapi.service.js";
export * from "./modules/publicapi/publicapi.error.js";

// Module 31 — Plateforme Mobile
export * from "./modules/mobile/mobile.types.js";
export * from "./modules/mobile/mobile.validation.js";
export * from "./modules/mobile/mobile.repository.js";
export * from "./modules/mobile/mobile.service.js";
export * from "./modules/mobile/mobile.error.js";

// Module 32 — Billing SaaS & Abonnements (Super Administration)
export * from "./modules/saas/saas.types.js";
export * from "./modules/saas/saas.validation.js";
export * from "./modules/saas/saas.repository.js";
export * from "./modules/saas/saas.payment-gateway.js";
export * from "./modules/saas/saas.service.js";
export * from "./modules/saas/saas.error.js";

// Module 33 — Super Administration (SaaS Control Center)
export * from "./modules/saasadmin/saasadmin.types.js";
export * from "./modules/saasadmin/saasadmin.validation.js";
export * from "./modules/saasadmin/saasadmin.repository.js";
export * from "./modules/saasadmin/saasadmin.service.js";
export * from "./modules/saasadmin/saasadmin.error.js";

// Sous-module 33.1 — Bootstrap & Initialisation du SaaS
export * from "./modules/bootstrap/bootstrap.types.js";
export * from "./modules/bootstrap/bootstrap.validation.js";
export * from "./modules/bootstrap/bootstrap.repository.js";
export * from "./modules/bootstrap/bootstrap.service.js";
export * from "./modules/bootstrap/bootstrap.error.js";

// Module 34 — Production Readiness, DevOps & Sécurité Entreprise
export * from "./modules/devops/devops.types.js";
export * from "./modules/devops/devops.validation.js";
export * from "./modules/devops/devops.repository.js";
export * from "./modules/devops/devops.service.js";
export * from "./modules/devops/devops.error.js";

// Module 35 — Finalisation, Audit Global & Go-Live
export * from "./modules/certification/certification.types.js";
export * from "./modules/certification/certification.repository.js";
export * from "./modules/certification/certification.service.js";
export * from "./modules/certification/certification.error.js";
