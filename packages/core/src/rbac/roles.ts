/**
 * Rôles système par défaut (seedés) — voir BusinessRules.md BR-1.
 *
 * Ces rôles sont **seedés** en base (`Role` + `RolePermission`) au premier déploiement.
 * Ils servent de point de départ : un administrateur peut ensuite **créer de nouveaux
 * rôles** et ajuster les permissions **sans modifier le code**, via le panneau d'admin
 * (Module 3 — IAM). Les rôles système ne sont pas supprimables (`isSystem = true`).
 *
 * ⭐ EXTENSIBILITÉ : le code ne dépend PAS d'une liste figée de rôles. Seuls ces rôles
 * "système" sont seedés ; tout autre rôle créé en base est pleinement fonctionnel.
 */

import type { PermissionCode } from "./permissions.js";
import { allPermissions } from "./permissions.js";

/** Rôle d'organisation : code + libellé + permissions. */
export interface SystemRole {
  code: string;
  label: string;
  description: string;
  permissions: PermissionCode[];
}

/** Helper : construit une liste de permissions unique. */
function perms(...codes: PermissionCode[]): PermissionCode[] {
  return Array.from(new Set(codes));
}

/**
 * Rôles système. `PLATFORM_ADMIN` (super admin) et `HOTEL_OWNER` (propriétaire) ont
 * accès à toutes les permissions définies ; les autres sont ciblés par métier.
 */
export const SYSTEM_ROLES: SystemRole[] = [
  {
    code: "PLATFORM_ADMIN",
    label: "Super Admin (plateforme)",
    description: "Accès total à la plateforme, toutes organisations et hôtels confondus.",
    permissions: perms(...allPermissions()),
  },
  {
    code: "HOTEL_OWNER",
    label: "Propriétaire",
    description: "Propriétaire d'établissement(s) : accès complet à son organisation et à ses hôtels.",
    permissions: perms(...allPermissions()),
  },
  {
    code: "FRONT_DESK",
    label: "Réception",
    description: "Réservations, check-in/out, allocation de chambres, clients et paiements.",
    permissions: perms(
      "settings.hotel.view",
      "rooms.view",
      "rooms.assign",
      "roomStatus.update",
      "reservations.create",
      "reservations.view",
      "reservations.update",
      "reservations.cancel",
      "reservations.confirm",
      "reservations.checkin",
      "reservations.checkout",
      "reservations.no_show",
      "reservations.allocate_room",
      "guests.create",
      "guests.view",
      "guests.update",
      "payments.create",
      "payments.view",
      "invoices.view",
      "housekeeping.view",
      "transport.view",
      "transport.create",
      "transport.update",
      "transport.cancel",
      "crm.view",
      "loyalty.view",
      "loyalty.redeem",
      "notifications.view",
      "notifications.send",
      "ai.view",
      "ai.assistant",
      "ai.automation",
      "channel.view",
      "channel.sync",
      "portal.view",
      "events.view",
      "events.manage",
      "events.service_orders",
    ),
  },
  {
    code: "HOUSEKEEPING",
    label: "Housekeeping (gouvernante)",
    description: "États des chambres et gestion du ménage.",
    permissions: perms(
      "roomStatus.update",
      "housekeeping.view",
      "housekeeping.update",
      "housekeeping.assign",
      "rooms.view",
      "laundry.view",
    ),
  },
  {
    code: "CASHIER",
    label: "Caissier",
    description: "Encaissements, caisse, point de vente et suivi des paiements.",
    permissions: perms(
      "payments.create",
      "payments.view",
      "caisse.view",
      "caisse.close",
      "pos.sell",
      "pos.open_shift",
      "pos.close_shift",
      "invoices.view",
      "guests.view",
      "reservations.view",
      "reports.view",
      "tips.create",
      "tips.view",
      "tips.distribute",
      "tips.cancel",
      "discounts.view",
      "discounts.apply",
      "loyalty.view",
      "loyalty.redeem",
    ),
  },
  {
    code: "WAITER",
    label: "Serveur (restaurant)",
    description: "Prise de commandes et ventes au restaurant/bar.",
    permissions: perms(
      "pos.sell",
      "pos.open_shift",
      "kitchen.read_menus",
      "invoices.view",
      "payments.create",
      "guests.view",
      "reservations.view",
    ),
  },
  {
    code: "KITCHEN",
    label: "Cuisinier",
    description: "Ordres et préparation en cuisine, lecture des menus.",
    permissions: perms(
      "kitchen.view_orders",
      "kitchen.update_order",
      "kitchen.read_menus",
    ),
  },
  {
    code: "STOCK_MANAGER",
    label: "Gestionnaire de stock",
    description: "Inventaire, réapprovisionnement et fournisseurs.",
    permissions: perms(
      "inventory.view",
      "inventory.adjust",
      "inventory.reorder",
      "inventory.receive",
      "stock.view",
      "laundry.view",
      "laundry.manage",
      "laundry.batch",
      "laundry.loss",
      "transport.view",
      "transport.create",
      "transport.update",
      "transport.assign",
      "transport.cancel",
      "crm.view",
      "crm.manage",
      "crm.segments",
      "crm.campaigns",
      "reports.view",
      "bi.view",
      "bi.export",
    ),
  },
  {
    code: "ACCOUNTANT",
    label: "Comptable",
    description: "Paiements, facturation, caisse, journal d'audit et rapports.",
    permissions: perms(
      "payments.view",
      "payments.refund",
      "invoices.view",
      "invoices.issue",
      "invoices.refund",
      "billing.consolidate",
      "audit.view",
      "audit.export",
      "caisse.view",
      "caisse.close",
      "reports.view",
      "bi.view",
      "bi.export",
      "admin.view",
      "admin.manage",
      "accounting.view",
      "accounting.manage",
      "accounting.post",
      "accounting.period",
      "accounting.reconcile",
      "loyalty.view",
      "notifications.view",
      "ai.view",
      "ai.assistant",
      "ai.automation",
      "channel.view",
    ),
  },
  {
    code: "MAINTENANCE",
    label: "Technicien maintenance",
    description: "Interventions de maintenance et mises hors service des chambres.",
    permissions: perms(
      "maintenance.create",
      "maintenance.update",
      "maintenance.complete",
      "roomStatus.update",
      "rooms.view",
    ),
  },
  {
    code: "GUEST",
    label: "Client (portail)",
    description: "Accès au portail client : réservations, factures, fidélité, profil.",
    permissions: perms(
      "portal.self_reservation",
      "portal.view_invoice",
      "portal.view_loyalty",
      "portal.guest_profile",
      "portal.view",
    ),
  },
];

/** Retourne un rôle système par code. */
export function findSystemRole(code: string): SystemRole | undefined {
  return SYSTEM_ROLES.find((r) => r.code === code);
}
