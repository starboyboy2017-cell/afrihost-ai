-- ============================================================================
-- AfriHost AI — Row Level Security (multitenant) — ADR-005
-- Fichier : infra/supabase/01-rls.sql
--
-- Garantit l'isolation entre hôtels AU NIVEAU base de données : même si une API
-- est compromise, PostgreSQL refuse tout accès inter-hôtel.
--
-- Principe : les tables métier portent `hotel_id`. Les policies filtrent par
-- `hotel_id = auth_hotel_id()`. Le JWT (Supabase Auth) contient `organisation_id`
-- et la liste des hôtels autorisés de l'utilisateur.
--
-- NB : exécuté via la console Supabase / migrations SQL en CI. À compléter au fur
-- et à mesure de l'ajout des tables (feuille de route).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers (résolution du tenant depuis le JWT)
-- ---------------------------------------------------------------------------

-- Organisation de l'utilisateur courant (du JWT claims.organisation_id)
create or replace function auth_org_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'organisation_id', ''),
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'organisation_id')
  )::uuid;
$$;

-- Vrai si l'utilisateur a accès à un hôtel donné
create or replace function auth_has_hotel(p_hotel_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public."Membership" m
    where m."hotelId" = p_hotel_id
      and m."userId" = auth.uid()
  );
$$;

-- Hôtel "actif" courant (le premier hôtel accessible, sinon null)
create or replace function auth_hotel_id()
returns uuid
language sql
stable
as $$
  select "hotelId"
  from public."Membership"
  where "userId" = auth.uid()
  order by "isDefault" desc, "createdAt"
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Example : policies sur la table Reservation
-- ---------------------------------------------------------------------------

alter table public."Reservation" enable row level security;

create policy "reservation_select" on public."Reservation"
  for select using ( auth_has_hotel("hotelId") );

create policy "reservation_insert" on public."Reservation"
  for insert with check ( auth_has_hotel("hotelId") );

create policy "reservation_update" on public."Reservation"
  for update using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") );

create policy "reservation_delete" on public."Reservation"
  for delete using ( auth_has_hotel("hotelId") );

-- ---------------------------------------------------------------------------
-- Journal d'audit : append-only (ADR-012) — jamais d'UPDATE/DELETE
-- ---------------------------------------------------------------------------

alter table public."AuditLog" enable row level security;

create policy "audit_insert" on public."AuditLog"
  for insert with check ( auth_has_hotel("hotelId") or auth_has_hotel(auth_hotel_id()) );

create policy "audit_select" on public."AuditLog"
  for select using ( auth_has_hotel("hotelId") or "actorUserId" = auth.uid() );

-- Pas de policy UPDATE/DELETE sur AuditLog => append-only garanti.

-- NB : étendre le même pattern à toutes les tables métier (Room, Guest,
-- Invoice, Payment, HousekeepingTask, ...) lors du développement de chaque module.

-- ⚠️ SUPERSE DE PAR 03-rls-policies.sql
-- Ce fichier est remplacé par le fichier consolidé 03-rls-policies.sql, intégré
-- directement dans la migration initiale. NE PAS exécuter sur la même base
-- (noms de policies en double). Conserver uniquement pour référence.
