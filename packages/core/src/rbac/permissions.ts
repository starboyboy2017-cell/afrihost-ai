/**
 * Registre des permissions (RBAC complet et extensible).
 *
 * Format : `module.action`. Ce registre est la **source de vérité** unique des permissions
 * seedées. Il sert à :
 *   1. valider les codes au runtime (typé),
 *   2. définir les rôles système par défaut (seed),
 *   3. documenter la matrice.
 *
 * ⭐ EXTENSIBILITÉ : ce registre définit les permissions **par défaut**. Les rôles sont
 * stockés en base (`Role`, `RolePermission`, `Membership`). Un administrateur peut créer
 * de **nouveaux rôles** et affecter n'importe quelle permission **sans toucher au code**,
 * via le panneau d'admin (Module 3 — IAM). Le registre n'est modifié que pour ajouter de
 * nouvelles permissions quand un module est développé (et son seed).
 */

export const PERMISSIONS = {
  // ---- Module: settings (paramètres généraux) ----
  "settings.organisation.view": true,
  "settings.organisation.update": true,
  "settings.hotel.view": true,
  "settings.hotel.update": true,
  "settings.integrations.manage": true,

  // ---- Module: hotels (multihôtel) ----
  "hotels.create": true,
  "hotels.update": true,
  "hotels.disable": true,
  "hotels.assign_role": true,

  // ---- Module: iam (utilisateurs / rôles) ----
  "users.manage": true,
  "users.assign_role": true,
  "roles.manage": true,

  // ---- Module: room-types ----
  "roomTypes.create": true,
  "roomTypes.update": true,
  "roomTypes.delete": true,

  // ---- Module: rooms ----
  "rooms.view": true,
  "rooms.create": true,
  "rooms.update": true,
  "rooms.delete": true,
  "rooms.assign": true,

  // ---- Module: room-status ----
  "roomStatus.update": true,

  // ---- Module: reservations ----
  "reservations.create": true,
  "reservations.view": true,
  "reservations.update": true,
  "reservations.cancel": true,
  "reservations.confirm": true,
  "reservations.checkin": true,
  "reservations.checkout": true,
  "reservations.no_show": true,
  "reservations.allocate_room": true,
  "reservations.discount_apply": true,

  // ---- Module: housekeeping ----
  "housekeeping.view": true,
  "housekeeping.update": true,
  "housekeeping.assign": true,
  "housekeeping.verify": true,

  // ---- Module: guests (clients) ----
  "guests.create": true,
  "guests.view": true,
  "guests.update": true,
  "guests.merge": true,

  // ---- Module: payments ----
  "payments.create": true,
  "payments.view": true,
  "payments.refund": true,

  // ---- Module: billing ----
  "billing.folio": true,
  "billing.transfer": true,
  "invoices.view": true,
  "invoices.issue": true,
  "invoices.refund": true,
  "billing.consolidate": true,

  // ---- Module: audit ----
  "audit.view": true,
  "audit.export": true,

  // ---- Module: reports ----
  "reports.view": true,

  // ---- Module: pos (point de vente / restaurant) ----
  "pos.sell": true,
  "pos.view": true,
  "pos.open_shift": true,
  "pos.close_shift": true,

  // ---- Module: caisse ----
  "caisse.view": true,
  "caisse.manage": true,
  "caisse.close": true,

  // ---- Module: tips (pourboires) ----
  "tips.create": true,
  "tips.view": true,
  "tips.validate": true,
  "tips.distribute": true,
  "tips.cancel": true,
  "tips.rules_manage": true,

  // ---- Module: discounts (remises / promotions / coupons) ----
  "discounts.view": true,
  "discounts.manage": true,
  "discounts.apply": true,
  "coupons.generate": true,
  "coupons.validate": true,

  // ---- Module: kitchen (cuisine) ----
  "kitchen.view_orders": true,
  "kitchen.update_order": true,
  "kitchen.read_menus": true,

  // ---- Module: inventory (stocks / fournisseurs) ----
  "inventory.view": true,
  "inventory.adjust": true,
  "inventory.reorder": true,
  "inventory.receive": true,
  "inventory.manage": true,
  "inventory.count": true,

  // ---- Module: crm ----
  "crm.view": true,
  "crm.manage": true,
  "crm.segments": true,
  "crm.campaigns": true,

  // ---- Module: loyalty (programme de fidélité) ----
  "loyalty.view": true,
  "loyalty.manage": true, // programmes, niveaux, règles, récompenses, bonus
  "loyalty.award": true, // attribution de points (moteur de règles)
  "loyalty.redeem": true, // échange de points
  "loyalty.adjust": true, // ajustement manuel

  // ---- Module: notifications (multicanales) ----
  "notifications.view": true,
  "notifications.manage": true, // fournisseurs, templates, déclencheurs
  "notifications.send": true, // envoi / déclenchement
  "notifications.campaigns": true, // campagnes programmées

  // ---- Module: ai (assistant, prédictions, automatisation) ----
  "ai.view": true,
  "ai.assistant": true, // assistant conversationnel
  "ai.manage": true, // fournisseurs LLM, configuration des fonctionnalités
  "ai.automation": true, // suggestions, prédictions, alertes, recommandations, priorisation

  // ---- Module: channel (Channel Manager / OTA) ----
  "channel.view": true,
  "channel.manage": true, // comptes OTA, mappings
  "channel.sync": true, // pousser disponibilités/tarifs/restrictions, traiter jobs
  "channel.inbound": true, // recevoir réservations / annulations OTA

  // ---- Module: portal (portail client) ----
  "portal.view": true,
  "portal.manage": true, // gestion des comptes/appareils par l'admin hôtel

  // ---- Module: events (événements & groupes) ----
  "events.view": true,
  "events.manage": true, // groupes, salles, équipements, événements, contrats
  "events.service_orders": true, // ordres de service
  "events.documents": true, // gestion documentaire

  // ---- Module: bi (reporting & business intelligence) ----
  "bi.view": true,
  "bi.manage": true, // tableaux de bord, rapports, planification
  "bi.export": true, // exports PDF/Excel/CSV

  // ---- Module: admin (administration & paramétrage global) ----
  "admin.view": true,
  "admin.manage": true, // modifier la configuration
  "admin.saas": true, // configuration SaaS globale (plateforme)

  // ---- Module: publicapi (API publique & marketplace) ----
  "publicapi.manage": true, // applications, credentials, webhooks, marketplace
  "publicapi.view": true, // consultation des logs/apps

  // ---- Module: mobile (plateforme mobile) ----
  "mobile.view": true,
  "mobile.manage": true, // appareils, push, sync
  "mobile.portal": true, // portail client mobile

  // ---- Module: saas (Billing SaaS, Super Administration, modules 32-35) ----
  "saas.plans": true, // gestion des plans d'abonnement
  "saas.subscriptions": true, // cycle de vie des abonnements
  "saas.billing": true, // facturation, factures, avoirs
  "saas.payments": true, // paiements auto & manuels, validation
  "saas.providers": true, // fournisseurs/moyens de paiement, coupons

  // ---- Module: saasadmin (Super Administration — SaaS Control Center, Module 33) ----
  "saasadmin.hotels": true, // gestion des hôtels (activation, suspension, transfert)
  "saasadmin.licenses": true, // licences SaaS
  "saasadmin.support": true, // support technique, tickets, SLA
  "saasadmin.monitoring": true, // monitoring, alertes
  "saasadmin.backups": true, // sauvegardes
  "saasadmin.impersonation": true, // impersonation sécurisée (Login As Hotel Admin)
  "saasadmin.dashboard": true, // tableau de bord SaaS
  "saasadmin.bootstrap": true, // initialisation du premier Super Admin (sous-module 33.1)

  // ---- Module: devops (Production Readiness, DevOps & Sécurité Entreprise, Module 34) ----
  "devops.health": true, // health dashboard
  "devops.security": true, // incidents, durcissement
  "devops.secrets": true, // rotation des secrets
  "devops.backups": true, // sauvegardes + intégrité
  "devops.report": true, // rapport de préparation à la production

  // ---- Module: certification (Finalisation, Audit Global & Go-Live, Module 35) ----
  "certification.audit": true, // audit global
  "certification.certify": true, // rapport de certification final

  // ---- Module: accounting (comptabilité) ----
  "accounting.view": true,
  "accounting.manage": true,
  "accounting.post": true,
  "accounting.period": true,
  "accounting.reconcile": true,
  "stock.view": true,

  // ---- Module: maintenance ----
  "maintenance.create": true,
  "maintenance.update": true,
  "maintenance.complete": true,

  // ---- Module: laundry (blanchisserie) ----
  "laundry.view": true,
  "laundry.manage": true,
  "laundry.batch": true,
  "laundry.loss": true,

  // ---- Module: transport (navettes & transferts) ----
  "transport.view": true,
  "transport.create": true,
  "transport.update": true,
  "transport.assign": true,
  "transport.cancel": true,

  // ---- Module: portal (client / portail) ----
  "portal.self_reservation": true,
  "portal.view_invoice": true,
  "portal.view_loyalty": true,
  "portal.guest_profile": true,
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;
export type PermissionSet = PermissionCode[];

/** Retourne toutes les permissions d'un module donné (ex: "reservations"). */
export function permissionsForModule(module: string): PermissionCode[] {
  return (Object.keys(PERMISSIONS) as PermissionCode[]).filter((code) =>
    code.startsWith(`${module}.`),
  );
}

/** Liste plate de tous les codes de permission (pour le seed). */
export function allPermissions(): PermissionCode[] {
  return Object.keys(PERMISSIONS) as PermissionCode[];
}
