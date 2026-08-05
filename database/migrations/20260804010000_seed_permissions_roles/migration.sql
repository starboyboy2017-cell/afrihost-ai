-- ============================================================================
-- AfriHost AI — Seed des permissions & rôles système (versionné)
-- Migration : 20260804010000_seed_permissions_roles
--
-- PRINCIPE MULTI-HÔTELS (isolation) :
--   * Les PERMISSIONS sont GLOBALES (table Permission, code unique) : seedées une
--     seule fois, indépendamment des hôtels/organisations.
--   * Les RÔLES sont PAR ORGANISATION (table Role, contrainte unique
--     (organisationId, name)). Une fonction Postgres + un trigger créent
--     automatiquement les 11 rôles système + leurs permissions pour CHAQUE
--     organisation à sa création. Chaque organisation/hôtel est donc isolé.
--
-- Source unique : packages/core/src/rbac/{permissions,roles}.ts
-- Idempotent : ON CONFLICT DO NOTHING / CREATE OR REPLACE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) PERMISSIONS GLOBALES (seed une fois)
-- ---------------------------------------------------------------------------
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'settings.organisation.view', 'settings', 'settings.organisation.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'settings.organisation.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'settings.organisation.update', 'settings', 'settings.organisation.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'settings.organisation.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'settings.hotel.view', 'settings', 'settings.hotel.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'settings.hotel.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'settings.hotel.update', 'settings', 'settings.hotel.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'settings.hotel.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'settings.integrations.manage', 'settings', 'settings.integrations.manage'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'settings.integrations.manage');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'hotels.create', 'hotels', 'hotels.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'hotels.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'hotels.update', 'hotels', 'hotels.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'hotels.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'hotels.disable', 'hotels', 'hotels.disable'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'hotels.disable');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'hotels.assign_role', 'hotels', 'hotels.assign_role'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'hotels.assign_role');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'users.manage', 'users', 'users.manage'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'users.manage');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'users.assign_role', 'users', 'users.assign_role'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'users.assign_role');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'roles.manage', 'roles', 'roles.manage'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'roles.manage');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'roomTypes.create', 'roomTypes', 'roomTypes.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'roomTypes.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'roomTypes.update', 'roomTypes', 'roomTypes.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'roomTypes.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'roomTypes.delete', 'roomTypes', 'roomTypes.delete'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'roomTypes.delete');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'rooms.view', 'rooms', 'rooms.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'rooms.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'rooms.create', 'rooms', 'rooms.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'rooms.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'rooms.update', 'rooms', 'rooms.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'rooms.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'rooms.delete', 'rooms', 'rooms.delete'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'rooms.delete');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'rooms.assign', 'rooms', 'rooms.assign'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'rooms.assign');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'roomStatus.update', 'roomStatus', 'roomStatus.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'roomStatus.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.create', 'reservations', 'reservations.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.view', 'reservations', 'reservations.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.update', 'reservations', 'reservations.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.cancel', 'reservations', 'reservations.cancel'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.cancel');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.confirm', 'reservations', 'reservations.confirm'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.confirm');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.checkin', 'reservations', 'reservations.checkin'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.checkin');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.checkout', 'reservations', 'reservations.checkout'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.checkout');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.no_show', 'reservations', 'reservations.no_show'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.no_show');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.allocate_room', 'reservations', 'reservations.allocate_room'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.allocate_room');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reservations.discount_apply', 'reservations', 'reservations.discount_apply'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reservations.discount_apply');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'housekeeping.view', 'housekeeping', 'housekeeping.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'housekeeping.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'housekeeping.update', 'housekeeping', 'housekeeping.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'housekeeping.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'housekeeping.assign', 'housekeeping', 'housekeeping.assign'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'housekeeping.assign');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'housekeeping.verify', 'housekeeping', 'housekeeping.verify'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'housekeeping.verify');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'guests.create', 'guests', 'guests.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'guests.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'guests.view', 'guests', 'guests.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'guests.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'guests.update', 'guests', 'guests.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'guests.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'guests.merge', 'guests', 'guests.merge'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'guests.merge');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'payments.create', 'payments', 'payments.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'payments.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'payments.view', 'payments', 'payments.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'payments.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'payments.refund', 'payments', 'payments.refund'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'payments.refund');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'invoices.view', 'invoices', 'invoices.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'invoices.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'invoices.issue', 'invoices', 'invoices.issue'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'invoices.issue');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'invoices.refund', 'invoices', 'invoices.refund'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'invoices.refund');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'billing.consolidate', 'billing', 'billing.consolidate'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'billing.consolidate');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'audit.view', 'audit', 'audit.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'audit.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'audit.export', 'audit', 'audit.export'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'audit.export');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'reports.view', 'reports', 'reports.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'reports.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'pos.sell', 'pos', 'pos.sell'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'pos.sell');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'pos.open_shift', 'pos', 'pos.open_shift'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'pos.open_shift');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'pos.close_shift', 'pos', 'pos.close_shift'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'pos.close_shift');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'caisse.view', 'caisse', 'caisse.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'caisse.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'caisse.close', 'caisse', 'caisse.close'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'caisse.close');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'kitchen.view_orders', 'kitchen', 'kitchen.view_orders'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'kitchen.view_orders');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'kitchen.update_order', 'kitchen', 'kitchen.update_order'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'kitchen.update_order');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'kitchen.read_menus', 'kitchen', 'kitchen.read_menus'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'kitchen.read_menus');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'inventory.view', 'inventory', 'inventory.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'inventory.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'inventory.adjust', 'inventory', 'inventory.adjust'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'inventory.adjust');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'inventory.reorder', 'inventory', 'inventory.reorder'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'inventory.reorder');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'inventory.receive', 'inventory', 'inventory.receive'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'inventory.receive');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'stock.view', 'stock', 'stock.view'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'stock.view');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'maintenance.create', 'maintenance', 'maintenance.create'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'maintenance.create');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'maintenance.update', 'maintenance', 'maintenance.update'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'maintenance.update');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'maintenance.complete', 'maintenance', 'maintenance.complete'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'maintenance.complete');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'portal.self_reservation', 'portal', 'portal.self_reservation'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'portal.self_reservation');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'portal.view_invoice', 'portal', 'portal.view_invoice'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'portal.view_invoice');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'portal.view_loyalty', 'portal', 'portal.view_loyalty'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'portal.view_loyalty');
INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), 'portal.guest_profile', 'portal', 'portal.guest_profile'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = 'portal.guest_profile');

-- ---------------------------------------------------------------------------
-- 2) FONCTION : création des rôles système + permissions pour une organisation
-- ---------------------------------------------------------------------------
create or replace function public.afrihost_seed_org_roles(v_org text)
returns void language plpgsql security definer set search_path = public as $$
declare
  rid text; -- les IDs sont TEXT (UUID stocké en texte)
begin
  -- PLATFORM_ADMIN — Super Admin (plateforme)
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'PLATFORM_ADMIN', 'Accès total à la plateforme, toutes organisations et hôtels confondus.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'PLATFORM_ADMIN');
  select id into rid from "Role" where "organisationId" = v_org and name = 'PLATFORM_ADMIN';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.organisation.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.organisation.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.hotel.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.hotel.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.integrations.manage'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.disable'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.assign_role'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'users.manage'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'users.assign_role'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roles.manage'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomTypes.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomTypes.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomTypes.delete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.delete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.assign'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomStatus.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.cancel'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.confirm'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.checkin'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.checkout'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.no_show'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.allocate_room'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.discount_apply'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.assign'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.verify'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.merge'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.refund'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.issue'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.refund'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'billing.consolidate'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'audit.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'audit.export'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reports.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.sell'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.open_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.close_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.close'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.view_orders'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.update_order'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.read_menus'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.adjust'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.reorder'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.receive'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'stock.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.complete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.self_reservation'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.view_invoice'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.view_loyalty'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.guest_profile'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- HOTEL_OWNER — Propriétaire
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'HOTEL_OWNER', 'Propriétaire d''établissement(s) : accès complet à son organisation et à ses hôtels.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'HOTEL_OWNER');
  select id into rid from "Role" where "organisationId" = v_org and name = 'HOTEL_OWNER';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.organisation.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.organisation.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.hotel.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.hotel.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.integrations.manage'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.disable'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'hotels.assign_role'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'users.manage'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'users.assign_role'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roles.manage'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomTypes.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomTypes.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomTypes.delete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.delete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.assign'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomStatus.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.cancel'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.confirm'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.checkin'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.checkout'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.no_show'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.allocate_room'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.discount_apply'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.assign'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.verify'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.merge'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.refund'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.issue'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.refund'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'billing.consolidate'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'audit.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'audit.export'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reports.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.sell'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.open_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.close_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.close'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.view_orders'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.update_order'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.read_menus'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.adjust'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.reorder'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.receive'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'stock.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.complete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.self_reservation'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.view_invoice'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.view_loyalty'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.guest_profile'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- FRONT_DESK — Réception
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'FRONT_DESK', 'Réservations, check-in/out, allocation de chambres, clients et paiements.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'FRONT_DESK');
  select id into rid from "Role" where "organisationId" = v_org and name = 'FRONT_DESK';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'settings.hotel.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.assign'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomStatus.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.cancel'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.confirm'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.checkin'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.checkout'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.no_show'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.allocate_room'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- HOUSEKEEPING — Housekeeping (gouvernante)
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'HOUSEKEEPING', 'États des chambres et gestion du ménage.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'HOUSEKEEPING');
  select id into rid from "Role" where "organisationId" = v_org and name = 'HOUSEKEEPING';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomStatus.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'housekeeping.assign'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- CASHIER — Caissier
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'CASHIER', 'Encaissements, caisse, point de vente et suivi des paiements.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'CASHIER');
  select id into rid from "Role" where "organisationId" = v_org and name = 'CASHIER';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.close'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.sell'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.open_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.close_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reports.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- WAITER — Serveur (restaurant)
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'WAITER', 'Prise de commandes et ventes au restaurant/bar.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'WAITER');
  select id into rid from "Role" where "organisationId" = v_org and name = 'WAITER';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.sell'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'pos.open_shift'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.read_menus'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'guests.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reservations.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- KITCHEN — Cuisinier
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'KITCHEN', 'Ordres et préparation en cuisine, lecture des menus.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'KITCHEN');
  select id into rid from "Role" where "organisationId" = v_org and name = 'KITCHEN';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.view_orders'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.update_order'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'kitchen.read_menus'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- STOCK_MANAGER — Gestionnaire de stock
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'STOCK_MANAGER', 'Inventaire, réapprovisionnement et fournisseurs.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'STOCK_MANAGER');
  select id into rid from "Role" where "organisationId" = v_org and name = 'STOCK_MANAGER';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.adjust'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.reorder'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'inventory.receive'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'stock.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reports.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- ACCOUNTANT — Comptable
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'ACCOUNTANT', 'Paiements, facturation, caisse, journal d''audit et rapports.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'ACCOUNTANT');
  select id into rid from "Role" where "organisationId" = v_org and name = 'ACCOUNTANT';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'payments.refund'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.issue'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'invoices.refund'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'billing.consolidate'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'audit.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'audit.export'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'caisse.close'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'reports.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- MAINTENANCE — Technicien maintenance
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'MAINTENANCE', 'Interventions de maintenance et mises hors service des chambres.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'MAINTENANCE');
  select id into rid from "Role" where "organisationId" = v_org and name = 'MAINTENANCE';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.create'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'maintenance.complete'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'roomStatus.update'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'rooms.view'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

  -- GUEST — Client (portail)
  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, 'GUEST', 'Accès au portail client : réservations, factures, fidélité, profil.', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = 'GUEST');
  select id into rid from "Role" where "organisationId" = v_org and name = 'GUEST';
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.self_reservation'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.view_invoice'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.view_loyalty'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = 'portal.guest_profile'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);

end $$;

-- ---------------------------------------------------------------------------
-- 3) TRIGGER : à la création d'une organisation, seed ses rôles système
-- ---------------------------------------------------------------------------
create or replace function public.afrihost_org_seed_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.afrihost_seed_org_roles(new.id);
  return new;
end $$;

drop trigger if exists trg_org_seed_roles on "Organisation";
create trigger trg_org_seed_roles
after insert on "Organisation"
for each row execute function public.afrihost_org_seed_trigger();

-- ---------------------------------------------------------------------------
-- 4) Seed des rôles pour les organisations EXISTANTES (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare o record;
begin
  for o in select id from "Organisation" loop
    perform public.afrihost_seed_org_roles(o.id);
  end loop;
end $$;
