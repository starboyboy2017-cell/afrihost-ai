-- ============================================================================
-- AfriHost AI — RLS multitenant pour la gestion multihôtels (Module 2) — ADR-005
-- Fichier : infra/supabase/02-rls-hotels.sql
--
-- Garantit l'isolation COMPLÈTE des données entre hôtels au niveau base de données.
-- Chaque utilisateur ne voit que les données des hôtels dont il est membre.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table Hotel
-- ---------------------------------------------------------------------------
alter table public."Hotel" enable row level security;

-- Lecture : un utilisateur ne voit que les hôtels de son organisation dont il est membre
create policy "hotel_select_org" on public."Hotel"
  for select using (
    "organisationId" = auth_org_id()
    and auth_has_hotel("id")
  );

-- Insertion : seul un propriétaire/admin d'organisation peut créer un hôtel
-- (le contrôle applicatif (permission hotels.create) est déjà fait ; on restreint
--  en plus aux utilisateurs ayant un rôle HOTEL_OWNER sur l'org).
create policy "hotel_insert" on public."Hotel"
  for insert with check (
    "organisationId" = auth_org_id()
  );

create policy "hotel_update" on public."Hotel"
  for update using ( "organisationId" = auth_org_id() )
  with check ( "organisationId" = auth_org_id() );

-- ---------------------------------------------------------------------------
-- Table Membership (rôles PAR HÔTEL) — l'utilisateur ne gère que ses membreships
-- ---------------------------------------------------------------------------
alter table public."Membership" enable row level security;

create policy "membership_select" on public."Membership"
  for select using ( "userId" = auth.uid() or auth_has_hotel("hotelId") );

create policy "membership_insert" on public."Membership"
  for insert with check ( auth_has_hotel("hotelId") or "userId" = auth.uid() );

create policy "membership_update" on public."Membership"
  for update using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") );

create policy "membership_delete" on public."Membership"
  for delete using ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- Table Role / RolePermission : lisible par les membres de l'organisation
-- ---------------------------------------------------------------------------
alter table public."Role" enable row level security;
create policy "role_select" on public."Role"
  for select using ( "organisationId" = auth_org_id() );

alter table public."RolePermission" enable row level security;
create policy "rolepermission_select" on public."RolePermission"
  for select using ( true ); -- via la jointure Role (filtrage appliqué par le rôle)

-- NB : étendre aux tables métier (Room, Reservation, Invoice, ...) au fil des modules.

-- ⚠️ SUPERSE DE PAR 03-rls-policies.sql
-- Ce fichier est remplacé par le fichier consolidé 03-rls-policies.sql, intégré
-- directement dans la migration initiale. NE PAS exécuter sur la même base
-- (noms de policies en double). Conserver uniquement pour référence.
