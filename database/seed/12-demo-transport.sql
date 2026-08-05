-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Transport (Module 12)
-- Fichier : database/seed/12-demo-transport.sql
--
-- Crée pour l'hôtel Cotonou :
--   * 2 véhicules (1 interne, 1 externe) ;
--   * 2 chauffeurs ;
--   * 2 réservations de transfert (1 aéroport CONFIRMED, 1 ville ASSIGNED avec
--     affectation véhicule + chauffeur).
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  v1 text; v2 text; d1 text; d2 text;
  tr1 text; tr2 text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Véhicules
  insert into "Vehicle"(id, "hotelId", name, plate, capacity, ownership, status, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Van 8 places', 'AB-1234-CO', 8, 'INTERNAL', 'AVAILABLE', now()
  where not exists (select 1 from "Vehicle" where "hotelId"=h_co and plate='AB-1234-CO') returning id into v1;
  if v1 is null then select "id" into v1 from "Vehicle" where "hotelId"=h_co and plate='AB-1234-CO'; end if;

  insert into "Vehicle"(id, "hotelId", name, plate, capacity, ownership, "providerName", status, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Berline', 'CD-5678-CO', 3, 'EXTERNAL', 'Taxi Pro', 'AVAILABLE', now()
  where not exists (select 1 from "Vehicle" where "hotelId"=h_co and plate='CD-5678-CO');

  -- Chauffeurs
  insert into "Driver"(id, "hotelId", "firstName", "lastName", phone, "licenseNo", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Jean', 'Kouassi', '+2290101', 'LIC-001', now()
  where not exists (select 1 from "Driver" where "hotelId"=h_co and "firstName"='Jean' and "lastName"='Kouassi') returning id into d1;
  if d1 is null then select "id" into d1 from "Driver" where "hotelId"=h_co and "firstName"='Jean'; end if;

  insert into "Driver"(id, "hotelId", "firstName", "lastName", phone, "licenseNo", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Paul', 'Zinsou', '+2290102', 'LIC-002', now()
  where not exists (select 1 from "Driver" where "hotelId"=h_co and "firstName"='Paul');

  -- Transferts
  insert into "Transfer"(id, "hotelId", "transferRef", type, status, "pickupLocation", "dropoffLocation", "scheduledAt", "paxCount", amount, currency, "updatedAt")
  select gen_random_uuid()::text, h_co, 'TR-2026-0001', 'AIRPORT', 'CONFIRMED', 'Aéroport de Cotonou', 'Hôtel Démo', now() + interval '1 day', 2, 15000, 'XOF', now()
  where not exists (select 1 from "Transfer" where "hotelId"=h_co and "transferRef"='TR-2026-0001') returning id into tr1;

  insert into "Transfer"(id, "hotelId", "transferRef", type, status, "pickupLocation", "dropoffLocation", "scheduledAt", "paxCount", amount, currency, "updatedAt")
  select gen_random_uuid()::text, h_co, 'TR-2026-0002', 'CITY', 'ASSIGNED', 'Hôtel Démo', 'Marché Dantokpa', now() + interval '2 hours', 4, 8000, 'XOF', now()
  where not exists (select 1 from "Transfer" where "hotelId"=h_co and "transferRef"='TR-2026-0002') returning id into tr2;

  -- Affectation sur le transfert 2 (véhicule 1 + chauffeur 1)
  if tr2 is not null then
    insert into "TransferAssignment"(id, "transferId", "vehicleId", "driverId", "createdBy")
    values (gen_random_uuid()::text, tr2, v1, d1, 'demo');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "Vehicle" v where v."hotelId"=h.id) as vehicules,
  (select count(*) from "Driver" d where d."hotelId"=h.id) as chauffeurs,
  (select count(*) from "Transfer" t where t."hotelId"=h.id) as transferts
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
