-- ============================================================================
-- AfriHost AI — RLS (Row Level Security) intégral — multi-tenant + RBAC
-- Fichier : infra/supabase/03-rls-policies.sql
--
-- ACTIVE le RLS sur TOUTES les tables et crée des policies minimales :
--   1. ISOLATION MULTITENANT : chaque utilisateur ne voit/écrit que les données
--      des HÔTELS dont il est membre (Membership).
--   2. RBAC PAR RÔLE : les écritures sont restreintes par permission (module.action)
--      via la chaîne Membership -> Role -> RolePermission -> Permission.
--
-- Ce fichier est CONCATÉNÉ au script de migration initial (migration.sql) pour que
-- les tables soient créées AVEC RLS dès le départ.
--
-- NB : les helpers sont SECURITY DEFINER pour résoudre le tenant sans récursion RLS.
--      Les superutilisateurs (postgres, service_role) contournent le RLS par nature ;
--      ce RLS protège les rôles anon/authenticated (PostgREST) = défense en profondeur.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) HELPERS (security definer, search_path fixé)
--
-- Les colonnes d'identité (id, authId, hotelId, organisationId, userId, ...) sont
-- de type TEXT (UUID stocké en texte). auth.uid() renvoie un `uuid` → on caste
-- systématiquement en `::text`. Les helpers renvoient donc des TEXT.
-- ---------------------------------------------------------------------------

-- id interne "User" de l'utilisateur connecté (User.authId = auth.uid()::text)
create or replace function auth_user_id()
returns text language sql stable security definer set search_path = public as $$
  select "id" from "User" u where u."authId" = auth.uid()::text limit 1;
$$;

-- organisation de l'utilisateur connecté
create or replace function auth_org_id()
returns text language sql stable security definer set search_path = public as $$
  select u."organisationId" from "User" u where u."id" = auth_user_id() limit 1;
$$;

-- l'utilisateur est-il membre de l'hôtel p_hotel ?
create or replace function auth_has_hotel(p_hotel text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m
    where m."hotelId" = p_hotel and m."userId" = auth_user_id()
  );
$$;

-- hôtel actif par défaut de l'utilisateur
create or replace function auth_hotel_id()
returns text language sql stable security definer set search_path = public as $$
  select m."hotelId" from "Membership" m
  where m."userId" = auth_user_id()
  order by m."isDefault" desc, m."createdAt" limit 1;
$$;

-- l'utilisateur est admin d'organisation / propriétaire (accès large)
create or replace function auth_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m join "Role" r on r.id = m."roleId"
    where m."userId" = auth_user_id() and r.name in ('PLATFORM_ADMIN','HOTEL_OWNER')
  );
$$;

-- l'utilisateur possède un rôle donné sur un hôtel
create or replace function auth_has_role(p_hotel text, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m join "Role" r on r.id = m."roleId"
    where m."hotelId" = p_hotel and m."userId" = auth_user_id() and r.name = p_role
  );
$$;

-- l'utilisateur possède une permission donnée sur un hôtel (RBAC)
create or replace function auth_has_permission(p_hotel text, p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m
    join "Role" r on r.id = m."roleId"
    join "RolePermission" rp on rp."roleId" = r.id
    join "Permission" pe on pe.id = rp."permissionId"
    where m."hotelId" = p_hotel and m."userId" = auth_user_id() and pe.code = p_code
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) ACTIVER LE RLS SUR TOUTES LES TABLES (+ FORCE pour défense en profondeur)
-- ---------------------------------------------------------------------------

alter table "Organisation" enable row level security, force row level security;
alter table "Hotel" enable row level security, force row level security;
alter table "User" enable row level security, force row level security;
alter table "Membership" enable row level security, force row level security;
alter table "Role" enable row level security, force row level security;
alter table "Permission" enable row level security, force row level security;
alter table "RolePermission" enable row level security, force row level security;
alter table "AuditLog" enable row level security, force row level security;
alter table "Guest" enable row level security, force row level security;
alter table "RoomType" enable row level security, force row level security;
alter table "Room" enable row level security, force row level security;
alter table "RoomStatusHistory" enable row level security, force row level security;
alter table "Reservation" enable row level security, force row level security;
alter table "ReservationStatusHistory" enable row level security, force row level security;
alter table "Invoice" enable row level security, force row level security;
alter table "InvoiceLine" enable row level security, force row level security;
alter table "Payment" enable row level security, force row level security;
alter table "Product" enable row level security, force row level security;
alter table "StockItem" enable row level security, force row level security;
alter table "HousekeepingTask" enable row level security, force row level security;
alter table "Notification" enable row level security, force row level security;
alter table "LoyaltyTransaction" enable row level security, force row level security;
alter table "SyncOutbox" enable row level security, force row level security;
alter table "Automation" enable row level security, force row level security;

-- ---------------------------------------------------------------------------
-- 3) POLICIES — TABLES GLOBALES (organisation / identité / RBAC)
-- ---------------------------------------------------------------------------

-- Organisation
create policy "org_select" on "Organisation" for select
  using ( "id" = auth_org_id() or auth_org_admin() );

-- User (identité) : voit son org ; peut modifier son profil ; admin gère les autres
create policy "user_select" on "User" for select
  using ( "organisationId" = auth_org_id() or "id" = auth_user_id() );
create policy "user_update_self" on "User" for update
  using ( "id" = auth_user_id() ) with check ( "id" = auth_user_id() );
create policy "user_admin_insert" on "User" for insert
  with check ( auth_org_admin() );
create policy "user_admin_delete" on "User" for delete
  using ( auth_org_admin() );

-- Membership : un utilisateur voit ses propres affectations ; un membre voit celles de son hôtel
create policy "membership_select" on "Membership" for select
  using ( "userId" = auth_user_id() or auth_has_hotel("hotelId") );
create policy "membership_insert" on "Membership" for insert
  with check ( auth_org_admin() or auth_has_hotel("hotelId") );
create policy "membership_update" on "Membership" for update
  using ( auth_org_admin() or auth_has_hotel("hotelId") )
  with check ( auth_org_admin() or auth_has_hotel("hotelId") );
create policy "membership_delete" on "Membership" for delete
  using ( auth_org_admin() or auth_has_hotel("hotelId") );

-- Role : lisible dans son org ; admin les modifie
create policy "role_select" on "Role" for select
  using ( "organisationId" = auth_org_id() );
create policy "role_admin_insert" on "Role" for insert with check ( auth_org_admin() );
create policy "role_admin_update" on "Role" for update
  using ( auth_org_admin() ) with check ( auth_org_admin() );
create policy "role_admin_delete" on "Role" for delete using ( auth_org_admin() );

-- Permission : lisible par tous les utilisateurs authentifiés
create policy "permission_select" on "Permission" for select using ( true );

-- RolePermission : lisible via les rôles de son org ; admin les modifie
create policy "roleperm_select" on "RolePermission" for select
  using ( exists( select 1 from "Role" r where r.id = "roleId" and r."organisationId" = auth_org_id() ) );
create policy "roleperm_admin_insert" on "RolePermission" for insert
  with check ( auth_org_admin() );
create policy "roleperm_admin_delete" on "RolePermission" for delete
  using ( auth_org_admin() );

-- ---------------------------------------------------------------------------
-- 4) POLICIES — AUDIT (append-only : INSERT + SELECT, jamais UPDATE/DELETE)
-- ---------------------------------------------------------------------------
create policy "audit_insert" on "AuditLog" for insert
  with check ( auth_has_hotel("hotelId") or auth_org_admin() );
create policy "audit_select" on "AuditLog" for select
  using ( auth_has_hotel("hotelId") or "actorUserId" = auth_user_id() or auth_org_admin() );
-- (aucune policy UPDATE/DELETE => append-only garanti)

-- ---------------------------------------------------------------------------
-- 5) POLICIES — TABLES PAR HÔTEL (isolation + RBAC sur écriture)
--    Pattern : SELECT = membre de l'hôtel
--              INSERT/UPDATE/DELETE = membre ET (admin OU permission module)
-- ---------------------------------------------------------------------------

-- Hotel (pas de hotelId ; c'est l'hôtel lui-même)
create policy "hotel_select" on "Hotel" for select
  using ( auth_has_hotel("id") or auth_org_admin() );
create policy "hotel_insert" on "Hotel" for insert with check ( auth_org_admin() );
create policy "hotel_update" on "Hotel" for update
  using ( auth_has_hotel("id") or auth_org_admin() )
  with check ( auth_org_admin() or auth_has_permission("id", 'hotels.update') );
create policy "hotel_delete" on "Hotel" for delete using ( auth_org_admin() );

-- RoomType
create policy "roomtype_select" on "RoomType" for select using ( auth_has_hotel("hotelId") );
create policy "roomtype_insert" on "RoomType" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.create') ) );
create policy "roomtype_update" on "RoomType" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.update') ) );
create policy "roomtype_delete" on "RoomType" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.delete') ) );

-- Room
create policy "room_select" on "Room" for select using ( auth_has_hotel("hotelId") );
create policy "room_insert" on "Room" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'rooms.create') ) );
create policy "room_update" on "Room" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'rooms.update') ) );
create policy "room_delete" on "Room" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'rooms.delete') ) );

-- RoomStatusHistory (table enfant : via Room)
create policy "roomstatushist_select" on "RoomStatusHistory" for select
  using ( exists( select 1 from "Room" r where r.id = "roomId" and auth_has_hotel(r."hotelId") ) );
create policy "roomstatushist_insert" on "RoomStatusHistory" for insert
  with check ( exists( select 1 from "Room" r where r.id = "roomId" and auth_has_hotel(r."hotelId") ) );

-- Reservation
create policy "reservation_select" on "Reservation" for select using ( auth_has_hotel("hotelId") );
create policy "reservation_insert" on "Reservation" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.create') ) );
create policy "reservation_update" on "Reservation" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.update') ) );
create policy "reservation_delete" on "Reservation" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.cancel') ) );

-- ReservationStatusHistory (enfant : via Reservation)
create policy "resstatushist_select" on "ReservationStatusHistory" for select
  using ( exists( select 1 from "Reservation" res where res.id = "reservationId" and auth_has_hotel(res."hotelId") ) );
create policy "resstatushist_insert" on "ReservationStatusHistory" for insert
  with check ( exists( select 1 from "Reservation" res where res.id = "reservationId" and auth_has_hotel(res."hotelId") ) );

-- Invoice
create policy "invoice_select" on "Invoice" for select using ( auth_has_hotel("hotelId") );
create policy "invoice_insert" on "Invoice" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'invoices.issue') ) );
create policy "invoice_update" on "Invoice" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'invoices.issue') ) );
create policy "invoice_delete" on "Invoice" for delete using ( auth_org_admin() );

-- InvoiceLine (enfant : via Invoice)
create policy "invoiceline_select" on "InvoiceLine" for select
  using ( exists( select 1 from "Invoice" i where i.id = "invoiceId" and auth_has_hotel(i."hotelId") ) );
create policy "invoiceline_insert" on "InvoiceLine" for insert
  with check ( exists( select 1 from "Invoice" i where i.id = "invoiceId" and auth_has_hotel(i."hotelId") ) );

-- Payment
create policy "payment_select" on "Payment" for select using ( auth_has_hotel("hotelId") );
create policy "payment_insert" on "Payment" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'payments.create') ) );
create policy "payment_update" on "Payment" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'payments.refund') ) );
create policy "payment_delete" on "Payment" for delete using ( auth_org_admin() );

-- Product
create policy "product_select" on "Product" for select using ( auth_has_hotel("hotelId") );
create policy "product_admin_insert" on "Product" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "product_admin_update" on "Product" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "product_admin_delete" on "Product" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- StockItem
create policy "stock_select" on "StockItem" for select using ( auth_has_hotel("hotelId") );
create policy "stock_admin_insert" on "StockItem" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "stock_admin_update" on "StockItem" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "stock_admin_delete" on "StockItem" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- HousekeepingTask
create policy "housekeeping_select" on "HousekeepingTask" for select using ( auth_has_hotel("hotelId") );
create policy "housekeeping_insert" on "HousekeepingTask" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'housekeeping.update') ) );
create policy "housekeeping_update" on "HousekeepingTask" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'housekeeping.update') ) );
create policy "housekeeping_delete" on "HousekeepingTask" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- Notification
create policy "notification_select" on "Notification" for select using ( auth_has_hotel("hotelId") );
create policy "notification_admin_insert" on "Notification" for insert with check ( auth_has_hotel("hotelId") );
create policy "notification_admin_update" on "Notification" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "notification_admin_delete" on "Notification" for delete using ( auth_has_hotel("hotelId") );

-- LoyaltyTransaction
create policy "loyalty_select" on "LoyaltyTransaction" for select using ( auth_has_hotel("hotelId") );
create policy "loyalty_admin_insert" on "LoyaltyTransaction" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "loyalty_admin_update" on "LoyaltyTransaction" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "loyalty_admin_delete" on "LoyaltyTransaction" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- Guest (hotelId nullable ; voir aussi son organisation)
create policy "guest_select" on "Guest" for select
  using ( ( "hotelId" is not null and auth_has_hotel("hotelId") ) or "organisationId" = auth_org_id() );
create policy "guest_insert" on "Guest" for insert
  with check ( ( "hotelId" is not null and auth_has_hotel("hotelId") )
               and ( auth_org_admin() or auth_has_permission("hotelId",'guests.create') ) );
create policy "guest_update" on "Guest" for update
  using ( ( "hotelId" is not null and auth_has_hotel("hotelId") ) or "organisationId" = auth_org_id() )
  with check ( ( "hotelId" is not null and auth_has_hotel("hotelId") )
               and ( auth_org_admin() or auth_has_permission("hotelId",'guests.update') ) );
create policy "guest_admin_delete" on "Guest" for delete using ( auth_org_admin() );

-- SyncOutbox
create policy "syncoutbox_select" on "SyncOutbox" for select using ( auth_has_hotel("hotelId") );
create policy "syncoutbox_insert" on "SyncOutbox" for insert with check ( auth_has_hotel("hotelId") );
create policy "syncoutbox_update" on "SyncOutbox" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "syncoutbox_delete" on "SyncOutbox" for delete using ( auth_has_hotel("hotelId") );

-- Automation
create policy "automation_select" on "Automation" for select using ( auth_has_hotel("hotelId") );
create policy "automation_admin_insert" on "Automation" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "automation_admin_update" on "Automation" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "automation_admin_delete" on "Automation" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ============================================================================
-- FIN RLS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MODULE 5 — TARIFS (RatePlan / RatePlanPrice / RatePlanRestriction)
-- Isolation par hôtel + RBAC roomTypes.*
-- ---------------------------------------------------------------------------

alter table "RatePlan" enable row level security, force row level security;
create policy "rateplan_select" on "RatePlan" for select using ( auth_has_hotel("hotelId") );
create policy "rateplan_insert" on "RatePlan" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.update') ) );
create policy "rateplan_update" on "RatePlan" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.update') ) );
create policy "rateplan_delete" on "RatePlan" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.update') ) );

alter table "RatePlanPrice" enable row level security, force row level security;
create policy "rateplanprice_select" on "RatePlanPrice" for select
  using ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId") ) );
create policy "rateplanprice_insert" on "RatePlanPrice" for insert
  with check ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId")
                       and ( auth_org_admin() or auth_has_permission(rp."hotelId",'roomTypes.update') ) ) );
create policy "rateplanprice_update" on "RatePlanPrice" for update
  using ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId") ) )
  with check ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId")
                       and ( auth_org_admin() or auth_has_permission(rp."hotelId",'roomTypes.update') ) ) );
create policy "rateplanprice_delete" on "RatePlanPrice" for delete
  using ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId")
                  and ( auth_org_admin() or auth_has_permission(rp."hotelId",'roomTypes.update') ) ) );

alter table "RatePlanRestriction" enable row level security, force row level security;
create policy "rateplanrest_select" on "RatePlanRestriction" for select
  using ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId") ) );
create policy "rateplanrest_insert" on "RatePlanRestriction" for insert
  with check ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId")
                       and ( auth_org_admin() or auth_has_permission(rp."hotelId",'roomTypes.update') ) ) );
create policy "rateplanrest_update" on "RatePlanRestriction" for update
  using ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId") ) )
  with check ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId")
                       and ( auth_org_admin() or auth_has_permission(rp."hotelId",'roomTypes.update') ) ) );
create policy "rateplanrest_delete" on "RatePlanRestriction" for delete
  using ( exists( select 1 from "RatePlan" rp where rp.id = "ratePlanId" and auth_has_hotel(rp."hotelId")
                  and ( auth_org_admin() or auth_has_permission(rp."hotelId",'roomTypes.update') ) ) );

-- ---------------------------------------------------------------------------
-- MODULE 7 — SÉJOURS (Stay / RoomAssignment)
-- Isolation par hôtel + RBAC reservations.*
-- ---------------------------------------------------------------------------

alter table "Stay" enable row level security, force row level security;
create policy "stay_select" on "Stay" for select using ( auth_has_hotel("hotelId") );
create policy "stay_insert" on "Stay" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.checkin') ) );
create policy "stay_update" on "Stay" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.checkin') ) );
create policy "stay_delete" on "Stay" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.checkin') ) );

alter table "RoomAssignment" enable row level security, force row level security;
create policy "roomassignment_select" on "RoomAssignment" for select
  using ( exists( select 1 from "Stay" s where s.id = "stayId" and auth_has_hotel(s."hotelId") ) );
create policy "roomassignment_insert" on "RoomAssignment" for insert
  with check ( exists( select 1 from "Stay" s where s.id = "stayId" and auth_has_hotel(s."hotelId")
                       and ( auth_org_admin() or auth_has_permission(s."hotelId",'reservations.checkin') ) ) );
create policy "roomassignment_update" on "RoomAssignment" for update
  using ( exists( select 1 from "Stay" s where s.id = "stayId" and auth_has_hotel(s."hotelId") ) )
  with check ( exists( select 1 from "Stay" s where s.id = "stayId" and auth_has_hotel(s."hotelId")
                       and ( auth_org_admin() or auth_has_permission(s."hotelId",'reservations.checkin') ) ) );
create policy "roomassignment_delete" on "RoomAssignment" for delete
  using ( exists( select 1 from "Stay" s where s.id = "stayId" and auth_has_hotel(s."hotelId")
                  and ( auth_org_admin() or auth_has_permission(s."hotelId",'reservations.checkin') ) ) );

-- ---------------------------------------------------------------------------
-- MODULE 9 — ÉVÉNEMENTS DE MÉNAGE (HousekeepingTaskEvent)
-- ---------------------------------------------------------------------------
alter table "HousekeepingTaskEvent" enable row level security, force row level security;
create policy "hkevent_select" on "HousekeepingTaskEvent" for select
  using ( exists( select 1 from "HousekeepingTask" h where h.id = "taskId" and auth_has_hotel(h."hotelId") ) );
create policy "hkevent_insert" on "HousekeepingTaskEvent" for insert
  with check ( exists( select 1 from "HousekeepingTask" h where h.id = "taskId" and auth_has_hotel(h."hotelId") ) );

-- ---------------------------------------------------------------------------
-- MODULE 10 — MAINTENANCE (MaintenanceRequest / MaintenanceEvent)
-- Isolation par hôtel + RBAC maintenance.*
-- ---------------------------------------------------------------------------

alter table "MaintenanceRequest" enable row level security, force row level security;
create policy "maint_select" on "MaintenanceRequest" for select using ( auth_has_hotel("hotelId") );
create policy "maint_insert" on "MaintenanceRequest" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'maintenance.create') ) );
create policy "maint_update" on "MaintenanceRequest" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'maintenance.update') ) );
create policy "maint_delete" on "MaintenanceRequest" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'maintenance.update') ) );

alter table "MaintenanceEvent" enable row level security, force row level security;
create policy "maintevent_select" on "MaintenanceEvent" for select
  using ( exists( select 1 from "MaintenanceRequest" m where m.id = "requestId" and auth_has_hotel(m."hotelId") ) );
create policy "maintevent_insert" on "MaintenanceEvent" for insert
  with check ( exists( select 1 from "MaintenanceRequest" m where m.id = "requestId" and auth_has_hotel(m."hotelId") ) );

-- ---------------------------------------------------------------------------
-- MODULE 11 — BLANCHISSERIE (LaundryItemType / LaundryItem / LaundryBatch /
--              LaundryBatchItem / LaundryLoss)
-- Isolation par hôtel + RBAC inventory.* / laundry (permissions laundry.*)
-- ---------------------------------------------------------------------------

alter table "LaundryItemType" enable row level security, force row level security;
create policy "lit_select" on "LaundryItemType" for select using ( auth_has_hotel("hotelId") );
create policy "lit_insert" on "LaundryItemType" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "lit_update" on "LaundryItemType" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "lit_delete" on "LaundryItemType" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "LaundryItem" enable row level security, force row level security;
create policy "li_select" on "LaundryItem" for select using ( auth_has_hotel("hotelId") );
create policy "li_insert" on "LaundryItem" for insert with check ( auth_has_hotel("hotelId") );
create policy "li_update" on "LaundryItem" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "li_delete" on "LaundryItem" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "LaundryBatch" enable row level security, force row level security;
create policy "lb_select" on "LaundryBatch" for select using ( auth_has_hotel("hotelId") );
create policy "lb_insert" on "LaundryBatch" for insert with check ( auth_has_hotel("hotelId") );
create policy "lb_update" on "LaundryBatch" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "lb_delete" on "LaundryBatch" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "LaundryBatchItem" enable row level security, force row level security;
create policy "lbi_select" on "LaundryBatchItem" for select
  using ( exists( select 1 from "LaundryBatch" b where b.id = "batchId" and auth_has_hotel(b."hotelId") ) );
create policy "lbi_insert" on "LaundryBatchItem" for insert
  with check ( exists( select 1 from "LaundryBatch" b where b.id = "batchId" and auth_has_hotel(b."hotelId") ) );

alter table "LaundryLoss" enable row level security, force row level security;
create policy "ll_select" on "LaundryLoss" for select using ( auth_has_hotel("hotelId") );
create policy "ll_insert" on "LaundryLoss" for insert with check ( auth_has_hotel("hotelId") );
create policy "ll_update" on "LaundryLoss" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "ll_delete" on "LaundryLoss" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 12 — TRANSPORT (Vehicle / Driver / Transfer / TransferAssignment)
-- Isolation par hôtel + RBAC transport.*
-- ---------------------------------------------------------------------------

alter table "Vehicle" enable row level security, force row level security;
create policy "vehicle_select" on "Vehicle" for select using ( auth_has_hotel("hotelId") );
create policy "vehicle_insert" on "Vehicle" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "vehicle_update" on "Vehicle" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "vehicle_delete" on "Vehicle" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "Driver" enable row level security, force row level security;
create policy "driver_select" on "Driver" for select using ( auth_has_hotel("hotelId") );
create policy "driver_insert" on "Driver" for insert with check ( auth_has_hotel("hotelId") );
create policy "driver_update" on "Driver" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "driver_delete" on "Driver" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "Transfer" enable row level security, force row level security;
create policy "transfer_select" on "Transfer" for select using ( auth_has_hotel("hotelId") );
create policy "transfer_insert" on "Transfer" for insert with check ( auth_has_hotel("hotelId") );
create policy "transfer_update" on "Transfer" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "transfer_delete" on "Transfer" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "TransferAssignment" enable row level security, force row level security;
create policy "tassign_select" on "TransferAssignment" for select
  using ( exists( select 1 from "Transfer" t where t.id = "transferId" and auth_has_hotel(t."hotelId") ) );
create policy "tassign_insert" on "TransferAssignment" for insert
  with check ( exists( select 1 from "Transfer" t where t.id = "transferId" and auth_has_hotel(t."hotelId") ) );
create policy "tassign_delete" on "TransferAssignment" for delete
  using ( exists( select 1 from "Transfer" t where t.id = "transferId" and auth_has_hotel(t."hotelId") ) );

-- ---------------------------------------------------------------------------
-- MODULE 13 — POS (PosPoint / PosMenu / PosMenuLine / PosOrder / PosOrderLine /
--              PosOrderEvent / PosPayment)
-- Isolation par hôtel + RBAC pos.*
-- ---------------------------------------------------------------------------

alter table "PosPoint" enable row level security, force row level security;
create policy "pospoint_select" on "PosPoint" for select using ( auth_has_hotel("hotelId") );
create policy "pospoint_insert" on "PosPoint" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "pospoint_update" on "PosPoint" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "pospoint_delete" on "PosPoint" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "PosMenu" enable row level security, force row level security;
create policy "posmenu_select" on "PosMenu" for select using ( auth_has_hotel("hotelId") );
create policy "posmenu_insert" on "PosMenu" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "posmenu_update" on "PosMenu" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "posmenu_delete" on "PosMenu" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "PosMenuLine" enable row level security, force row level security;
create policy "posmenuline_select" on "PosMenuLine" for select
  using ( exists( select 1 from "PosMenu" m where m.id = "menuId" and auth_has_hotel(m."hotelId") ) );
create policy "posmenuline_insert" on "PosMenuLine" for insert
  with check ( exists( select 1 from "PosMenu" m where m.id = "menuId" and auth_has_hotel(m."hotelId") and auth_org_admin() ) );
create policy "posmenuline_update" on "PosMenuLine" for update
  using ( exists( select 1 from "PosMenu" m where m.id = "menuId" and auth_has_hotel(m."hotelId") ) )
  with check ( exists( select 1 from "PosMenu" m where m.id = "menuId" and auth_has_hotel(m."hotelId") ) );
create policy "posmenuline_delete" on "PosMenuLine" for delete
  using ( exists( select 1 from "PosMenu" m where m.id = "menuId" and auth_has_hotel(m."hotelId") and auth_org_admin() ) );

alter table "PosOrder" enable row level security, force row level security;
create policy "posorder_select" on "PosOrder" for select using ( auth_has_hotel("hotelId") );
create policy "posorder_insert" on "PosOrder" for insert with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'pos.sell') ) );
create policy "posorder_update" on "PosOrder" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "posorder_delete" on "PosOrder" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "PosOrderLine" enable row level security, force row level security;
create policy "posorderline_select" on "PosOrderLine" for select
  using ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") ) );
create policy "posorderline_insert" on "PosOrderLine" for insert
  with check ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") and ( auth_org_admin() or auth_has_permission(o."hotelId",'pos.sell') ) ) );
create policy "posorderline_update" on "PosOrderLine" for update
  using ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") ) )
  with check ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") ) );
create policy "posorderline_delete" on "PosOrderLine" for delete
  using ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") and auth_org_admin() ) );

alter table "PosOrderEvent" enable row level security, force row level security;
create policy "posevent_select" on "PosOrderEvent" for select
  using ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") ) );
create policy "posevent_insert" on "PosOrderEvent" for insert
  with check ( exists( select 1 from "PosOrder" o where o.id = "orderId" and auth_has_hotel(o."hotelId") ) );

alter table "PosPayment" enable row level security, force row level security;
create policy "pospayment_select" on "PosPayment" for select using ( auth_has_hotel("hotelId") );
create policy "pospayment_insert" on "PosPayment" for insert with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'pos.sell') ) );
create policy "pospayment_update" on "PosPayment" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "pospayment_delete" on "PosPayment" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 14 — CUISINE (KitchenStation / KitchenOrder / KitchenOrderLine /
--              KitchenOrderEvent)
-- Isolation par hôtel + RBAC kitchen.*
-- ---------------------------------------------------------------------------

alter table "KitchenStation" enable row level security, force row level security;
create policy "kstation_select" on "KitchenStation" for select using ( auth_has_hotel("hotelId") );
create policy "kstation_insert" on "KitchenStation" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "kstation_update" on "KitchenStation" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "kstation_delete" on "KitchenStation" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "KitchenOrder" enable row level security, force row level security;
create policy "korder_select" on "KitchenOrder" for select using ( auth_has_hotel("hotelId") );
create policy "korder_insert" on "KitchenOrder" for insert with check ( auth_has_hotel("hotelId") );
create policy "korder_update" on "KitchenOrder" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "korder_delete" on "KitchenOrder" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "KitchenOrderLine" enable row level security, force row level security;
create policy "korderline_select" on "KitchenOrderLine" for select
  using ( exists( select 1 from "KitchenOrder" o where o.id = "kitchenOrderId" and auth_has_hotel(o."hotelId") ) );
create policy "korderline_insert" on "KitchenOrderLine" for insert
  with check ( exists( select 1 from "KitchenOrder" o where o.id = "kitchenOrderId" and auth_has_hotel(o."hotelId") ) );

alter table "KitchenOrderEvent" enable row level security, force row level security;
create policy "kevent_select" on "KitchenOrderEvent" for select
  using ( exists( select 1 from "KitchenOrder" o where o.id = "kitchenOrderId" and auth_has_hotel(o."hotelId") ) );
create policy "kevent_insert" on "KitchenOrderEvent" for insert
  with check ( exists( select 1 from "KitchenOrder" o where o.id = "kitchenOrderId" and auth_has_hotel(o."hotelId") ) );

-- ---------------------------------------------------------------------------
-- MODULE 15 — CAISSE (CashRegister / CashSession / CashMovement)
-- Isolation par hôtel + RBAC caisse.*
-- ---------------------------------------------------------------------------

alter table "CashRegister" enable row level security, force row level security;
create policy "creg_select" on "CashRegister" for select using ( auth_has_hotel("hotelId") );
create policy "creg_insert" on "CashRegister" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "creg_update" on "CashRegister" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "creg_delete" on "CashRegister" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "CashSession" enable row level security, force row level security;
create policy "csess_select" on "CashSession" for select using ( auth_has_hotel("hotelId") );
create policy "csess_insert" on "CashSession" for insert with check ( auth_has_hotel("hotelId") );
create policy "csess_update" on "CashSession" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "csess_delete" on "CashSession" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "CashMovement" enable row level security, force row level security;
create policy "cmov_select" on "CashMovement" for select using ( auth_has_hotel("hotelId") );
create policy "cmov_insert" on "CashMovement" for insert with check ( auth_has_hotel("hotelId") );
create policy "cmov_update" on "CashMovement" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "cmov_delete" on "CashMovement" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 16 — POURBOIRES (TipRule / Tip / TipAllocation / TipEvent)
-- Isolation par hôtel + RBAC tips.*
-- ---------------------------------------------------------------------------

alter table "TipRule" enable row level security, force row level security;
create policy "tiprule_select" on "TipRule" for select using ( auth_has_hotel("hotelId") );
create policy "tiprule_insert" on "TipRule" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "tiprule_update" on "TipRule" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "tiprule_delete" on "TipRule" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "Tip" enable row level security, force row level security;
create policy "tip_select" on "Tip" for select using ( auth_has_hotel("hotelId") );
create policy "tip_insert" on "Tip" for insert with check ( auth_has_hotel("hotelId") );
create policy "tip_update" on "Tip" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "tip_delete" on "Tip" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "TipAllocation" enable row level security, force row level security;
create policy "tipalloc_select" on "TipAllocation" for select
  using ( exists( select 1 from "Tip" t where t.id = "tipId" and auth_has_hotel(t."hotelId") ) );
create policy "tipalloc_insert" on "TipAllocation" for insert
  with check ( exists( select 1 from "Tip" t where t.id = "tipId" and auth_has_hotel(t."hotelId") ) );

alter table "TipEvent" enable row level security, force row level security;
create policy "tipevent_select" on "TipEvent" for select
  using ( exists( select 1 from "Tip" t where t.id = "tipId" and auth_has_hotel(t."hotelId") ) );
create policy "tipevent_insert" on "TipEvent" for insert
  with check ( exists( select 1 from "Tip" t where t.id = "tipId" and auth_has_hotel(t."hotelId") ) );

-- ---------------------------------------------------------------------------
-- MODULE 17 — REMISES / PROMOTIONS / COUPONS (DiscountRule / Coupon)
-- Isolation par hôtel + RBAC discounts.*
-- ---------------------------------------------------------------------------

alter table "DiscountRule" enable row level security, force row level security;
create policy "dr_select" on "DiscountRule" for select using ( auth_has_hotel("hotelId") );
create policy "dr_insert" on "DiscountRule" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "dr_update" on "DiscountRule" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "dr_delete" on "DiscountRule" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "Coupon" enable row level security, force row level security;
create policy "cp_select" on "Coupon" for select using ( auth_has_hotel("hotelId") );
create policy "cp_insert" on "Coupon" for insert with check ( auth_has_hotel("hotelId") );
create policy "cp_update" on "Coupon" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "cp_delete" on "Coupon" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 18 — STOCK & INVENTAIRE (StockCategory, Supplier, UnitOfMeasure,
--              Warehouse, PurchaseOrder, PurchaseOrderLine, StockReceipt,
--              StockReceiptLine, StockMovement, StockCount, StockCountLine)
-- Isolation par hôtel + RBAC inventory.*
-- ---------------------------------------------------------------------------

-- Helper de récurrence simplifié : chaque table parente filtre par hotelId.

alter table "StockCategory" enable row level security, force row level security;
create policy "scat_select" on "StockCategory" for select using ( auth_has_hotel("hotelId") );
create policy "scat_insert" on "StockCategory" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "scat_update" on "StockCategory" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "scat_delete" on "StockCategory" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "Supplier" enable row level security, force row level security;
create policy "sup_select" on "Supplier" for select using ( auth_has_hotel("hotelId") );
create policy "sup_insert" on "Supplier" for insert with check ( auth_has_hotel("hotelId") );
create policy "sup_update" on "Supplier" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "sup_delete" on "Supplier" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "UnitOfMeasure" enable row level security, force row level security;
create policy "uom_select" on "UnitOfMeasure" for select using ( auth_has_hotel("hotelId") );
create policy "uom_insert" on "UnitOfMeasure" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "uom_update" on "UnitOfMeasure" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "uom_delete" on "UnitOfMeasure" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "Warehouse" enable row level security, force row level security;
create policy "wh_select" on "Warehouse" for select using ( auth_has_hotel("hotelId") );
create policy "wh_insert" on "Warehouse" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "wh_update" on "Warehouse" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "wh_delete" on "Warehouse" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "PurchaseOrder" enable row level security, force row level security;
create policy "po_select" on "PurchaseOrder" for select using ( auth_has_hotel("hotelId") );
create policy "po_insert" on "PurchaseOrder" for insert with check ( auth_has_hotel("hotelId") );
create policy "po_update" on "PurchaseOrder" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "po_delete" on "PurchaseOrder" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "PurchaseOrderLine" enable row level security, force row level security;
create policy "pol_select" on "PurchaseOrderLine" for select
  using ( exists( select 1 from "PurchaseOrder" o where o.id = "purchaseOrderId" and auth_has_hotel(o."hotelId") ) );
create policy "pol_insert" on "PurchaseOrderLine" for insert
  with check ( exists( select 1 from "PurchaseOrder" o where o.id = "purchaseOrderId" and auth_has_hotel(o."hotelId") ) );

alter table "StockReceipt" enable row level security, force row level security;
create policy "sr_select" on "StockReceipt" for select using ( auth_has_hotel("hotelId") );
create policy "sr_insert" on "StockReceipt" for insert with check ( auth_has_hotel("hotelId") );
create policy "sr_update" on "StockReceipt" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "sr_delete" on "StockReceipt" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "StockReceiptLine" enable row level security, force row level security;
create policy "srl_select" on "StockReceiptLine" for select
  using ( exists( select 1 from "StockReceipt" r where r.id = "receiptId" and auth_has_hotel(r."hotelId") ) );
create policy "srl_insert" on "StockReceiptLine" for insert
  with check ( exists( select 1 from "StockReceipt" r where r.id = "receiptId" and auth_has_hotel(r."hotelId") ) );

alter table "StockMovement" enable row level security, force row level security;
create policy "sm_select" on "StockMovement" for select using ( auth_has_hotel("hotelId") );
create policy "sm_insert" on "StockMovement" for insert with check ( auth_has_hotel("hotelId") );
create policy "sm_update" on "StockMovement" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "sm_delete" on "StockMovement" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "StockCount" enable row level security, force row level security;
create policy "sc_select" on "StockCount" for select using ( auth_has_hotel("hotelId") );
create policy "sc_insert" on "StockCount" for insert with check ( auth_has_hotel("hotelId") );
create policy "sc_update" on "StockCount" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "sc_delete" on "StockCount" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "StockCountLine" enable row level security, force row level security;
create policy "scl_select" on "StockCountLine" for select
  using ( exists( select 1 from "StockCount" c where c.id = "stockCountId" and auth_has_hotel(c."hotelId") ) );
create policy "scl_insert" on "StockCountLine" for insert
  with check ( exists( select 1 from "StockCount" c where c.id = "stockCountId" and auth_has_hotel(c."hotelId") ) );

-- ---------------------------------------------------------------------------
-- MODULE 19 — COMPTABILITÉ (AccountingPeriod, Account, CostCenter,
--              AccountingJournal, JournalEntry, JournalEntryLine,
--              AccountBalance, BankReconciliation)
-- Isolation par hôtel + RBAC accounting.*
-- ---------------------------------------------------------------------------

alter table "AccountingPeriod" enable row level security, force row level security;
create policy "aperiod_select" on "AccountingPeriod" for select using ( auth_has_hotel("hotelId") );
create policy "aperiod_insert" on "AccountingPeriod" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "aperiod_update" on "AccountingPeriod" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "Account" enable row level security, force row level security;
create policy "account_select" on "Account" for select using ( auth_has_hotel("hotelId") );
create policy "account_insert" on "Account" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "account_update" on "Account" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "account_delete" on "Account" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "CostCenter" enable row level security, force row level security;
create policy "cc_select" on "CostCenter" for select using ( auth_has_hotel("hotelId") );
create policy "cc_insert" on "CostCenter" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "cc_update" on "CostCenter" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "AccountingJournal" enable row level security, force row level security;
create policy "aj_select" on "AccountingJournal" for select using ( auth_has_hotel("hotelId") );
create policy "aj_insert" on "AccountingJournal" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "aj_update" on "AccountingJournal" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "JournalEntry" enable row level security, force row level security;
create policy "je_select" on "JournalEntry" for select using ( auth_has_hotel("hotelId") );
create policy "je_insert" on "JournalEntry" for insert with check ( auth_has_hotel("hotelId") );
create policy "je_update" on "JournalEntry" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "JournalEntryLine" enable row level security, force row level security;
create policy "jel_select" on "JournalEntryLine" for select
  using ( exists( select 1 from "JournalEntry" e where e.id = "entryId" and auth_has_hotel(e."hotelId") ) );
create policy "jel_insert" on "JournalEntryLine" for insert
  with check ( exists( select 1 from "JournalEntry" e where e.id = "entryId" and auth_has_hotel(e."hotelId") ) );

alter table "AccountBalance" enable row level security, force row level security;
create policy "ab_select" on "AccountBalance" for select using ( auth_has_hotel("hotelId") );
create policy "ab_insert" on "AccountBalance" for insert with check ( auth_has_hotel("hotelId") );

alter table "BankReconciliation" enable row level security, force row level security;
create policy "br_select" on "BankReconciliation" for select using ( auth_has_hotel("hotelId") );
create policy "br_insert" on "BankReconciliation" for insert with check ( auth_has_hotel("hotelId") );
create policy "br_update" on "BankReconciliation" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 20 — PAIEMENTS & FACTURATION (Folio, FolioLine, PaymentGateway)
-- Isolation par hôtel + RBAC billing.*
-- ---------------------------------------------------------------------------

alter table "Folio" enable row level security, force row level security;
create policy "folio_select" on "Folio" for select using ( auth_has_hotel("hotelId") );
create policy "folio_insert" on "Folio" for insert with check ( auth_has_hotel("hotelId") );
create policy "folio_update" on "Folio" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "FolioLine" enable row level security, force row level security;
create policy "folioline_select" on "FolioLine" for select
  using ( exists( select 1 from "Folio" f where f.id = "folioId" and auth_has_hotel(f."hotelId") ) );
create policy "folioline_insert" on "FolioLine" for insert
  with check ( exists( select 1 from "Folio" f where f.id = "folioId" and auth_has_hotel(f."hotelId") ) );

alter table "PaymentGateway" enable row level security, force row level security;
create policy "pg_select" on "PaymentGateway" for select using ( auth_has_hotel("hotelId") );
create policy "pg_insert" on "PaymentGateway" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "pg_update" on "PaymentGateway" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "pg_delete" on "PaymentGateway" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 21 — CRM (Company, GuestPreference, CustomerSegment, Campaign,
--              CampaignSend, CustomerInteraction, CustomerTask, Opportunity)
-- Isolation par hôtel + RBAC crm.*
-- ---------------------------------------------------------------------------

alter table "Company" enable row level security, force row level security;
create policy "company_select" on "Company" for select using ( auth_has_hotel("hotelId") );
create policy "company_insert" on "Company" for insert with check ( auth_has_hotel("hotelId") );
create policy "company_update" on "Company" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "GuestPreference" enable row level security, force row level security;
create policy "pref_select" on "GuestPreference" for select using ( auth_has_hotel("hotelId") );
create policy "pref_insert" on "GuestPreference" for insert with check ( auth_has_hotel("hotelId") );
create policy "pref_update" on "GuestPreference" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "CustomerSegment" enable row level security, force row level security;
create policy "seg_select" on "CustomerSegment" for select using ( auth_has_hotel("hotelId") );
create policy "seg_insert" on "CustomerSegment" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "seg_update" on "CustomerSegment" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "Campaign" enable row level security, force row level security;
create policy "camp_select" on "Campaign" for select using ( auth_has_hotel("hotelId") );
create policy "camp_insert" on "Campaign" for insert with check ( auth_has_hotel("hotelId") );
create policy "camp_update" on "Campaign" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "CampaignSend" enable row level security, force row level security;
create policy "campsend_select" on "CampaignSend" for select using ( auth_has_hotel("hotelId") );
create policy "campsend_insert" on "CampaignSend" for insert with check ( auth_has_hotel("hotelId") );
create policy "campsend_update" on "CampaignSend" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "CustomerInteraction" enable row level security, force row level security;
create policy "interact_select" on "CustomerInteraction" for select using ( auth_has_hotel("hotelId") );
create policy "interact_insert" on "CustomerInteraction" for insert with check ( auth_has_hotel("hotelId") );

alter table "CustomerTask" enable row level security, force row level security;
create policy "task_select" on "CustomerTask" for select using ( auth_has_hotel("hotelId") );
create policy "task_insert" on "CustomerTask" for insert with check ( auth_has_hotel("hotelId") );
create policy "task_update" on "CustomerTask" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "Opportunity" enable row level security, force row level security;
create policy "opp_select" on "Opportunity" for select using ( auth_has_hotel("hotelId") );
create policy "opp_insert" on "Opportunity" for insert with check ( auth_has_hotel("hotelId") );
create policy "opp_update" on "Opportunity" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 22 — PROGRAMME DE FIDÉLITÉ
-- (LoyaltyProgram, LoyaltyProgramHotel, LoyaltyTier, LoyaltyRule, LoyaltyReward,
--  LoyaltyBonus, LoyaltyMember, LoyaltyRedemption, LoyaltyNotification)
-- Isolation par hôtel / groupe d'hôtels + RBAC loyalty.*
-- ---------------------------------------------------------------------------

-- Helper : l'utilisateur est membre d'un hôtel participant au programme
-- (couvre les programmes HOTEL et GROUP via LoyaltyProgramHotel).
create or replace function auth_in_program(p_program text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "LoyaltyProgramHotel" lph
    join "Membership" m on m."hotelId" = lph."hotelId"
    where lph."programId" = p_program and m."userId" = auth_user_id()
  );
$$;

alter table "LoyaltyProgram" enable row level security, force row level security;
create policy "lp_select" on "LoyaltyProgram" for select using ( auth_in_program("id") or auth_org_admin() );
create policy "lp_insert" on "LoyaltyProgram" for insert with check ( auth_org_admin() );
create policy "lp_update" on "LoyaltyProgram" for update using ( auth_in_program("id") or auth_org_admin() ) with check ( auth_org_admin() );
create policy "lp_delete" on "LoyaltyProgram" for delete using ( auth_org_admin() );

alter table "LoyaltyProgramHotel" enable row level security, force row level security;
create policy "lph_select" on "LoyaltyProgramHotel" for select using ( auth_in_program("programId") or auth_org_admin() );
create policy "lph_insert" on "LoyaltyProgramHotel" for insert with check ( auth_org_admin() );
create policy "lph_delete" on "LoyaltyProgramHotel" for delete using ( auth_org_admin() );

alter table "LoyaltyTier" enable row level security, force row level security;
create policy "lt_select" on "LoyaltyTier" for select using ( auth_in_program("programId") or auth_org_admin() );
create policy "lt_insert" on "LoyaltyTier" for insert with check ( auth_org_admin() );
create policy "lt_update" on "LoyaltyTier" for update using ( auth_in_program("programId") or auth_org_admin() ) with check ( auth_org_admin() );
create policy "lt_delete" on "LoyaltyTier" for delete using ( auth_org_admin() );

alter table "LoyaltyRule" enable row level security, force row level security;
create policy "lr_select" on "LoyaltyRule" for select using ( auth_in_program("programId") or auth_org_admin() );
create policy "lr_insert" on "LoyaltyRule" for insert with check ( auth_org_admin() );
create policy "lr_update" on "LoyaltyRule" for update using ( auth_in_program("programId") or auth_org_admin() ) with check ( auth_org_admin() );
create policy "lr_delete" on "LoyaltyRule" for delete using ( auth_org_admin() );

alter table "LoyaltyReward" enable row level security, force row level security;
create policy "lrw_select" on "LoyaltyReward" for select using ( auth_in_program("programId") or auth_org_admin() );
create policy "lrw_insert" on "LoyaltyReward" for insert with check ( auth_org_admin() );
create policy "lrw_update" on "LoyaltyReward" for update using ( auth_in_program("programId") or auth_org_admin() ) with check ( auth_org_admin() );
create policy "lrw_delete" on "LoyaltyReward" for delete using ( auth_org_admin() );

alter table "LoyaltyBonus" enable row level security, force row level security;
create policy "lb_select" on "LoyaltyBonus" for select using ( auth_in_program("programId") or auth_org_admin() );
create policy "lb_insert" on "LoyaltyBonus" for insert with check ( auth_org_admin() );
create policy "lb_update" on "LoyaltyBonus" for update using ( auth_in_program("programId") or auth_org_admin() ) with check ( auth_org_admin() );
create policy "lb_delete" on "LoyaltyBonus" for delete using ( auth_org_admin() );

alter table "LoyaltyMember" enable row level security, force row level security;
create policy "lm_select" on "LoyaltyMember" for select using ( auth_has_hotel("hotelId") );
create policy "lm_insert" on "LoyaltyMember" for insert with check ( auth_has_hotel("hotelId") );
create policy "lm_update" on "LoyaltyMember" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "LoyaltyRedemption" enable row level security, force row level security;
create policy "lred_select" on "LoyaltyRedemption" for select using ( auth_has_hotel("hotelId") );
create policy "lred_insert" on "LoyaltyRedemption" for insert with check ( auth_has_hotel("hotelId") );
create policy "lred_update" on "LoyaltyRedemption" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "LoyaltyNotification" enable row level security, force row level security;
create policy "ln_select" on "LoyaltyNotification" for select using ( auth_has_hotel("hotelId") );
create policy "ln_insert" on "LoyaltyNotification" for insert with check ( auth_has_hotel("hotelId") );
create policy "ln_update" on "LoyaltyNotification" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "LoyaltyTransaction" enable row level security, force row level security;
create policy "ltr_select" on "LoyaltyTransaction" for select using ( auth_has_hotel("hotelId") );
create policy "ltr_insert" on "LoyaltyTransaction" for insert with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 23 — NOTIFICATIONS MULTICANALES
-- (NotificationProvider, NotificationTemplate, NotificationTrigger,
--  NotificationCampaign, NotificationSend)
-- Isolation par hôtel + RBAC notifications.*
-- ---------------------------------------------------------------------------

alter table "NotificationProvider" enable row level security, force row level security;
create policy "nprov_select" on "NotificationProvider" for select using ( auth_has_hotel("hotelId") );
create policy "nprov_insert" on "NotificationProvider" for insert with check ( auth_has_hotel("hotelId") );
create policy "nprov_update" on "NotificationProvider" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "nprov_delete" on "NotificationProvider" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "NotificationTemplate" enable row level security, force row level security;
create policy "ntpl_select" on "NotificationTemplate" for select using ( auth_has_hotel("hotelId") );
create policy "ntpl_insert" on "NotificationTemplate" for insert with check ( auth_has_hotel("hotelId") );
create policy "ntpl_update" on "NotificationTemplate" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "ntpl_delete" on "NotificationTemplate" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "NotificationTrigger" enable row level security, force row level security;
create policy "ntrg_select" on "NotificationTrigger" for select using ( auth_has_hotel("hotelId") );
create policy "ntrg_insert" on "NotificationTrigger" for insert with check ( auth_has_hotel("hotelId") );
create policy "ntrg_update" on "NotificationTrigger" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "ntrg_delete" on "NotificationTrigger" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "NotificationCampaign" enable row level security, force row level security;
create policy "ncmp_select" on "NotificationCampaign" for select using ( auth_has_hotel("hotelId") );
create policy "ncmp_insert" on "NotificationCampaign" for insert with check ( auth_has_hotel("hotelId") );
create policy "ncmp_update" on "NotificationCampaign" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "ncmp_delete" on "NotificationCampaign" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "NotificationSend" enable row level security, force row level security;
create policy "nsend_select" on "NotificationSend" for select using ( auth_has_hotel("hotelId") );
create policy "nsend_insert" on "NotificationSend" for insert with check ( auth_has_hotel("hotelId") );
create policy "nsend_update" on "NotificationSend" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- Notification (table existante) : policies déjà présentes dans la migration init.

-- ---------------------------------------------------------------------------
-- MODULE 24 — IA (assistant, prédictions, automatisation)
-- (AiProvider, AiFeature, AiRequest, AiSuggestion, AiPrediction, AiAlert,
--  AiRecommendation)
-- Isolation par hôtel + RBAC ai.*
-- ---------------------------------------------------------------------------

alter table "AiProvider" enable row level security, force row level security;
create policy "aiprov_select" on "AiProvider" for select using ( auth_has_hotel("hotelId") );
create policy "aiprov_insert" on "AiProvider" for insert with check ( auth_has_hotel("hotelId") );
create policy "aiprov_update" on "AiProvider" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "aiprov_delete" on "AiProvider" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "AiFeature" enable row level security, force row level security;
create policy "aifeat_select" on "AiFeature" for select using ( auth_has_hotel("hotelId") );
create policy "aifeat_insert" on "AiFeature" for insert with check ( auth_has_hotel("hotelId") );
create policy "aifeat_update" on "AiFeature" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "aifeat_delete" on "AiFeature" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "AiRequest" enable row level security, force row level security;
create policy "aireq_select" on "AiRequest" for select using ( auth_has_hotel("hotelId") );
create policy "aireq_insert" on "AiRequest" for insert with check ( auth_has_hotel("hotelId") );
create policy "aireq_update" on "AiRequest" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "AiSuggestion" enable row level security, force row level security;
create policy "aisug_select" on "AiSuggestion" for select using ( auth_has_hotel("hotelId") );
create policy "aisug_insert" on "AiSuggestion" for insert with check ( auth_has_hotel("hotelId") );
create policy "aisug_update" on "AiSuggestion" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "AiPrediction" enable row level security, force row level security;
create policy "aipred_select" on "AiPrediction" for select using ( auth_has_hotel("hotelId") );
create policy "aipred_insert" on "AiPrediction" for insert with check ( auth_has_hotel("hotelId") );
create policy "aipred_update" on "AiPrediction" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "AiAlert" enable row level security, force row level security;
create policy "aialert_select" on "AiAlert" for select using ( auth_has_hotel("hotelId") );
create policy "aialert_insert" on "AiAlert" for insert with check ( auth_has_hotel("hotelId") );
create policy "aialert_update" on "AiAlert" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "AiRecommendation" enable row level security, force row level security;
create policy "airec_select" on "AiRecommendation" for select using ( auth_has_hotel("hotelId") );
create policy "airec_insert" on "AiRecommendation" for insert with check ( auth_has_hotel("hotelId") );
create policy "airec_update" on "AiRecommendation" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 25 — CHANNEL MANAGER / OTA
-- (ChannelAccount, ChannelRoomMapping, ChannelSyncJob, ChannelSyncLog,
--  ChannelRateOverride)
-- Isolation par hôtel + RBAC channel.*
-- ---------------------------------------------------------------------------

alter table "ChannelAccount" enable row level security, force row level security;
create policy "chacc_select" on "ChannelAccount" for select using ( auth_has_hotel("hotelId") );
create policy "chacc_insert" on "ChannelAccount" for insert with check ( auth_has_hotel("hotelId") );
create policy "chacc_update" on "ChannelAccount" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "chacc_delete" on "ChannelAccount" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "ChannelRoomMapping" enable row level security, force row level security;
create policy "chmap_select" on "ChannelRoomMapping" for select using ( auth_has_hotel("hotelId") );
create policy "chmap_insert" on "ChannelRoomMapping" for insert with check ( auth_has_hotel("hotelId") );
create policy "chmap_update" on "ChannelRoomMapping" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "chmap_delete" on "ChannelRoomMapping" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "ChannelSyncJob" enable row level security, force row level security;
create policy "chjob_select" on "ChannelSyncJob" for select using ( auth_has_hotel("hotelId") );
create policy "chjob_insert" on "ChannelSyncJob" for insert with check ( auth_has_hotel("hotelId") );
create policy "chjob_update" on "ChannelSyncJob" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "ChannelSyncLog" enable row level security, force row level security;
create policy "chlog_select" on "ChannelSyncLog" for select using ( auth_has_hotel("hotelId") );
create policy "chlog_insert" on "ChannelSyncLog" for insert with check ( auth_has_hotel("hotelId") );

alter table "ChannelRateOverride" enable row level security, force row level security;
create policy "chrate_select" on "ChannelRateOverride" for select using ( auth_has_hotel("hotelId") );
create policy "chrate_insert" on "ChannelRateOverride" for insert with check ( auth_has_hotel("hotelId") );
create policy "chrate_update" on "ChannelRateOverride" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 26 — PORTAIL CLIENT
-- (PortalUser, PortalDevice, PortalMessage, PortalServiceRequest,
--  PortalNotification)
-- Isolation par hôtel + RBAC portal.*
-- ---------------------------------------------------------------------------

alter table "PortalUser" enable row level security, force row level security;
create policy "puser_select" on "PortalUser" for select using ( auth_has_hotel("hotelId") );
create policy "puser_insert" on "PortalUser" for insert with check ( auth_has_hotel("hotelId") );
create policy "puser_update" on "PortalUser" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "PortalDevice" enable row level security, force row level security;
create policy "pdev_select" on "PortalDevice" for select using ( auth_has_hotel("hotelId") );
create policy "pdev_insert" on "PortalDevice" for insert with check ( auth_has_hotel("hotelId") );
create policy "pdev_update" on "PortalDevice" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "PortalMessage" enable row level security, force row level security;
create policy "pmsg_select" on "PortalMessage" for select using ( auth_has_hotel("hotelId") );
create policy "pmsg_insert" on "PortalMessage" for insert with check ( auth_has_hotel("hotelId") );
create policy "pmsg_update" on "PortalMessage" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "PortalServiceRequest" enable row level security, force row level security;
create policy "preq_select" on "PortalServiceRequest" for select using ( auth_has_hotel("hotelId") );
create policy "preq_insert" on "PortalServiceRequest" for insert with check ( auth_has_hotel("hotelId") );
create policy "preq_update" on "PortalServiceRequest" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "PortalNotification" enable row level security, force row level security;
create policy "pnotif_select" on "PortalNotification" for select using ( auth_has_hotel("hotelId") );
create policy "pnotif_insert" on "PortalNotification" for insert with check ( auth_has_hotel("hotelId") );
create policy "pnotif_update" on "PortalNotification" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 27 — ÉVÉNEMENTS & GROUPES
-- (EventGroup, EventVenue, EventEquipment, HotelEvent, EventContract,
--  EventServiceOrder, EventDocument)
-- Isolation par hôtel + RBAC events.*
-- ---------------------------------------------------------------------------

alter table "EventGroup" enable row level security, force row level security;
create policy "evgrp_select" on "EventGroup" for select using ( auth_has_hotel("hotelId") );
create policy "evgrp_insert" on "EventGroup" for insert with check ( auth_has_hotel("hotelId") );
create policy "evgrp_update" on "EventGroup" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "evgrp_delete" on "EventGroup" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "EventVenue" enable row level security, force row level security;
create policy "evven_select" on "EventVenue" for select using ( auth_has_hotel("hotelId") );
create policy "evven_insert" on "EventVenue" for insert with check ( auth_has_hotel("hotelId") );
create policy "evven_update" on "EventVenue" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "EventEquipment" enable row level security, force row level security;
create policy "eveq_select" on "EventEquipment" for select using ( auth_has_hotel("hotelId") );
create policy "eveq_insert" on "EventEquipment" for insert with check ( auth_has_hotel("hotelId") );
create policy "eveq_update" on "EventEquipment" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "HotelEvent" enable row level security, force row level security;
create policy "evev_select" on "HotelEvent" for select using ( auth_has_hotel("hotelId") );
create policy "evev_insert" on "HotelEvent" for insert with check ( auth_has_hotel("hotelId") );
create policy "evev_update" on "HotelEvent" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "EventContract" enable row level security, force row level security;
create policy "evctr_select" on "EventContract" for select using ( auth_has_hotel("hotelId") );
create policy "evctr_insert" on "EventContract" for insert with check ( auth_has_hotel("hotelId") );
create policy "evctr_update" on "EventContract" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "EventServiceOrder" enable row level security, force row level security;
create policy "evord_select" on "EventServiceOrder" for select using ( auth_has_hotel("hotelId") );
create policy "evord_insert" on "EventServiceOrder" for insert with check ( auth_has_hotel("hotelId") );
create policy "evord_update" on "EventServiceOrder" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "EventDocument" enable row level security, force row level security;
create policy "evdoc_select" on "EventDocument" for select using ( auth_has_hotel("hotelId") );
create policy "evdoc_insert" on "EventDocument" for insert with check ( auth_has_hotel("hotelId") );
create policy "evdoc_delete" on "EventDocument" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 28 — REPORTING & BUSINESS INTELLIGENCE
-- (BiDashboard, BiReport, BiSchedule)
-- Isolation par hôtel + RBAC bi.*
-- ---------------------------------------------------------------------------

alter table "BiDashboard" enable row level security, force row level security;
create policy "bidash_select" on "BiDashboard" for select using ( auth_has_hotel("hotelId") );
create policy "bidash_insert" on "BiDashboard" for insert with check ( auth_has_hotel("hotelId") );
create policy "bidash_update" on "BiDashboard" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "bidash_delete" on "BiDashboard" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "BiReport" enable row level security, force row level security;
create policy "birep_select" on "BiReport" for select using ( auth_has_hotel("hotelId") );
create policy "birep_insert" on "BiReport" for insert with check ( auth_has_hotel("hotelId") );
create policy "birep_update" on "BiReport" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "birep_delete" on "BiReport" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

alter table "BiSchedule" enable row level security, force row level security;
create policy "bisch_select" on "BiSchedule" for select using ( auth_has_hotel("hotelId") );
create policy "bisch_insert" on "BiSchedule" for insert with check ( auth_has_hotel("hotelId") );
create policy "bisch_update" on "BiSchedule" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "bisch_delete" on "BiSchedule" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 29 — ADMINISTRATION & PARAMÉTRAGE GLOBAL
-- (AdminConfig)
-- Isolation par hôtel (scope HOTEL) ; scope SAAS réservé aux admins plateforme.
-- ---------------------------------------------------------------------------

alter table "AdminConfig" enable row level security, force row level security;
-- Lecture : configs de l'hôtel (scope HOTEL, hotelId = son hôtel) ou SaaS global.
create policy "adm_select" on "AdminConfig" for select
  using ( ( scope = 'HOTEL' and auth_has_hotel("hotelId") ) or ( scope = 'SAAS' and auth_org_admin() ) );
create policy "adm_insert" on "AdminConfig" for insert
  with check ( ( scope = 'HOTEL' and auth_has_hotel("hotelId") ) or ( scope = 'SAAS' and auth_org_admin() ) );
create policy "adm_update" on "AdminConfig" for update
  using ( ( scope = 'HOTEL' and auth_has_hotel("hotelId") ) or ( scope = 'SAAS' and auth_org_admin() ) )
  with check ( ( scope = 'HOTEL' and auth_has_hotel("hotelId") ) or ( scope = 'SAAS' and auth_org_admin() ) );
create policy "adm_delete" on "AdminConfig" for delete
  using ( ( scope = 'HOTEL' and auth_has_hotel("hotelId") ) or ( scope = 'SAAS' and auth_org_admin() ) );

-- ---------------------------------------------------------------------------
-- MODULE 30 — API PUBLIQUE & MARKETPLACE
-- (ApiApp, ApiCredential, ApiWebhook, ApiWebhookDelivery, ApiMarketplaceApp,
--  ApiAccessLog)
-- Entités globales cross-hôtel. L'isolation multi-hôtel est garantie au niveau
-- service par ownerOrgId et les scopes de credentials (hotels autorisés).
-- RLS : accès aux utilisateurs authentifiés de la plateforme.
-- ---------------------------------------------------------------------------

alter table "ApiApp" enable row level security, force row level security;
create policy "apapp_select" on "ApiApp" for select using ( auth_user_id() is not null );
create policy "apapp_insert" on "ApiApp" for insert with check ( auth_user_id() is not null );
create policy "apapp_update" on "ApiApp" for update using ( auth_user_id() is not null ) with check ( auth_user_id() is not null );
create policy "apapp_delete" on "ApiApp" for delete using ( auth_org_admin() );

alter table "ApiCredential" enable row level security, force row level security;
create policy "apcred_select" on "ApiCredential" for select using ( auth_user_id() is not null );
create policy "apcred_insert" on "ApiCredential" for insert with check ( auth_user_id() is not null );
create policy "apcred_update" on "ApiCredential" for update using ( auth_user_id() is not null ) with check ( auth_user_id() is not null );

alter table "ApiWebhook" enable row level security, force row level security;
create policy "apwh_select" on "ApiWebhook" for select using ( auth_user_id() is not null );
create policy "apwh_insert" on "ApiWebhook" for insert with check ( auth_user_id() is not null );
create policy "apwh_update" on "ApiWebhook" for update using ( auth_user_id() is not null ) with check ( auth_user_id() is not null );

alter table "ApiWebhookDelivery" enable row level security, force row level security;
create policy "apwhd_select" on "ApiWebhookDelivery" for select using ( auth_user_id() is not null );
create policy "apwhd_insert" on "ApiWebhookDelivery" for insert with check ( auth_user_id() is not null );
create policy "apwhd_update" on "ApiWebhookDelivery" for update using ( auth_user_id() is not null ) with check ( auth_user_id() is not null );

alter table "ApiMarketplaceApp" enable row level security, force row level security;
create policy "apmp_select" on "ApiMarketplaceApp" for select using ( auth_user_id() is not null );
create policy "apmp_insert" on "ApiMarketplaceApp" for insert with check ( auth_user_id() is not null );
create policy "apmp_update" on "ApiMarketplaceApp" for update using ( auth_user_id() is not null ) with check ( auth_user_id() is not null );

alter table "ApiAccessLog" enable row level security, force row level security;
create policy "aplog_select" on "ApiAccessLog" for select using ( auth_user_id() is not null );
create policy "aplog_insert" on "ApiAccessLog" for insert with check ( auth_user_id() is not null );

-- ---------------------------------------------------------------------------
-- MODULE 31 — PLATEFORME MOBILE
-- (MobileDevice, PushToken, MobileSyncLog)
-- Isolation par hôtel + RBAC mobile.*
-- ---------------------------------------------------------------------------

alter table "MobileDevice" enable row level security, force row level security;
create policy "mobdev_select" on "MobileDevice" for select using ( auth_has_hotel("hotelId") );
create policy "mobdev_insert" on "MobileDevice" for insert with check ( auth_has_hotel("hotelId") );
create policy "mobdev_update" on "MobileDevice" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "PushToken" enable row level security, force row level security;
create policy "pushtok_select" on "PushToken" for select using ( auth_has_hotel("hotelId") );
create policy "pushtok_insert" on "PushToken" for insert with check ( auth_has_hotel("hotelId") );
create policy "pushtok_update" on "PushToken" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

alter table "MobileSyncLog" enable row level security, force row level security;
create policy "mobsync_select" on "MobileSyncLog" for select using ( auth_has_hotel("hotelId") );
create policy "mobsync_insert" on "MobileSyncLog" for insert with check ( auth_has_hotel("hotelId") );
create policy "mobsync_update" on "MobileSyncLog" for update using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- MODULE 32-35 — SUPER ADMINISTRATION (Billing SaaS, etc.)
-- Ces entités sont globales (cross-hôtel) et réservées au Super Admin
-- (PLATFORM_ADMIN). Jamais accessibles depuis le portail hôtels/clients.
-- Helper : est-on Super Admin plateforme ?
-- ---------------------------------------------------------------------------
create or replace function auth_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m join "Role" r on r.id = m."roleId"
    where m."userId" = auth_user_id() and r.name = 'PLATFORM_ADMIN'
  );
$$;

alter table "SaasPlan" enable row level security, force row level security;
create policy "saasplan_select" on "SaasPlan" for select using ( auth_platform_admin() );
create policy "saasplan_insert" on "SaasPlan" for insert with check ( auth_platform_admin() );
create policy "saasplan_update" on "SaasPlan" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );
create policy "saasplan_delete" on "SaasPlan" for delete using ( auth_platform_admin() );

alter table "SaasSubscription" enable row level security, force row level security;
create policy "saassub_select" on "SaasSubscription" for select using ( auth_platform_admin() );
create policy "saassub_insert" on "SaasSubscription" for insert with check ( auth_platform_admin() );
create policy "saassub_update" on "SaasSubscription" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasInvoice" enable row level security, force row level security;
create policy "saasinv_select" on "SaasInvoice" for select using ( auth_platform_admin() );
create policy "saasinv_insert" on "SaasInvoice" for insert with check ( auth_platform_admin() );
create policy "saasinv_update" on "SaasInvoice" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasPayment" enable row level security, force row level security;
create policy "saaspay_select" on "SaasPayment" for select using ( auth_platform_admin() );
create policy "saaspay_insert" on "SaasPayment" for insert with check ( auth_platform_admin() );
create policy "saaspay_update" on "SaasPayment" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasManualPayment" enable row level security, force row level security;
create policy "saasmp_select" on "SaasManualPayment" for select using ( auth_platform_admin() );
create policy "saasmp_insert" on "SaasManualPayment" for insert with check ( auth_platform_admin() );
create policy "saasmp_update" on "SaasManualPayment" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasPaymentMethod" enable row level security, force row level security;
create policy "saasmeth_select" on "SaasPaymentMethod" for select using ( auth_platform_admin() );
create policy "saasmeth_insert" on "SaasPaymentMethod" for insert with check ( auth_platform_admin() );
create policy "saasmeth_update" on "SaasPaymentMethod" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasCoupon" enable row level security, force row level security;
create policy "saascoup_select" on "SaasCoupon" for select using ( auth_platform_admin() );
create policy "saascoup_insert" on "SaasCoupon" for insert with check ( auth_platform_admin() );
create policy "saascoup_update" on "SaasCoupon" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 33 — SUPER ADMINISTRATION (SaaS Control Center)
-- (SaasLicense, SaasSupportTicket, SaasSupportMessage, SaasMonitorCheck,
--  SaasBackup, SaasImpersonation, SaasMetrics)
-- Réservé au Super Admin (auth_platform_admin). Jamais au portail hôtels/clients.
-- ---------------------------------------------------------------------------

alter table "SaasLicense" enable row level security, force row level security;
create policy "slic_select" on "SaasLicense" for select using ( auth_platform_admin() );
create policy "slic_insert" on "SaasLicense" for insert with check ( auth_platform_admin() );
create policy "slic_update" on "SaasLicense" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasSupportTicket" enable row level security, force row level security;
create policy "stkt_select" on "SaasSupportTicket" for select using ( auth_platform_admin() );
create policy "stkt_insert" on "SaasSupportTicket" for insert with check ( auth_platform_admin() );
create policy "stkt_update" on "SaasSupportTicket" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasSupportMessage" enable row level security, force row level security;
create policy "smsg_select" on "SaasSupportMessage" for select using ( auth_platform_admin() );
create policy "smsg_insert" on "SaasSupportMessage" for insert with check ( auth_platform_admin() );

alter table "SaasMonitorCheck" enable row level security, force row level security;
create policy "smchk_select" on "SaasMonitorCheck" for select using ( auth_platform_admin() );
create policy "smchk_insert" on "SaasMonitorCheck" for insert with check ( auth_platform_admin() );

alter table "SaasBackup" enable row level security, force row level security;
create policy "sbak_select" on "SaasBackup" for select using ( auth_platform_admin() );
create policy "sbak_insert" on "SaasBackup" for insert with check ( auth_platform_admin() );
create policy "sbak_update" on "SaasBackup" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasImpersonation" enable row level security, force row level security;
create policy "simp_select" on "SaasImpersonation" for select using ( auth_platform_admin() );
create policy "simp_insert" on "SaasImpersonation" for insert with check ( auth_platform_admin() );
create policy "simp_update" on "SaasImpersonation" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SaasMetrics" enable row level security, force row level security;
create policy "smet_select" on "SaasMetrics" for select using ( auth_platform_admin() );
create policy "smet_insert" on "SaasMetrics" for insert with check ( auth_platform_admin() );

-- ---------------------------------------------------------------------------
-- MODULE 34 — PRODUCTION READINESS, DEVOPS & SÉCURITÉ ENTREPRISE
-- (HealthCheck, SecurityIncident, SecretRotation, IntegrityCheck)
-- Réservé au Super Admin (auth_platform_admin).
-- ---------------------------------------------------------------------------

alter table "HealthCheck" enable row level security, force row level security;
create policy "hcheck_select" on "HealthCheck" for select using ( auth_platform_admin() );
create policy "hcheck_insert" on "HealthCheck" for insert with check ( auth_platform_admin() );

alter table "SecurityIncident" enable row level security, force row level security;
create policy "sinc_select" on "SecurityIncident" for select using ( auth_platform_admin() );
create policy "sinc_insert" on "SecurityIncident" for insert with check ( auth_platform_admin() );
create policy "sinc_update" on "SecurityIncident" for update using ( auth_platform_admin() ) with check ( auth_platform_admin() );

alter table "SecretRotation" enable row level security, force row level security;
create policy "srot_select" on "SecretRotation" for select using ( auth_platform_admin() );
create policy "srot_insert" on "SecretRotation" for insert with check ( auth_platform_admin() );

alter table "IntegrityCheck" enable row level security, force row level security;
create policy "icheck_select" on "IntegrityCheck" for select using ( auth_platform_admin() );
create policy "icheck_insert" on "IntegrityCheck" for insert with check ( auth_platform_admin() );
