-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Événements & Groupes (Module 27)
-- Fichier : database/seed/27-demo-events.sql
--
-- Pour l'hôtel Cotonou :
--   * une salle, un équipement ;
--   * un groupe + une entreprise/organisateur (Company du CRM) ;
--   * un événement (séminaire), un contrat/devis, un ordre de service.
--
-- IDEMPOTENT. NB : pgcrypto requis. Exécuter après seed 05 et seed 21 (CRM).
-- ============================================================================

do $$
declare
  h_co text;
  co text;
  venue_id text;
  grp_id text;
  evt_id text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Entreprise / organisateur (Company du CRM)
  select "id" into co from "Company" where "hotelId"=h_co limit 1;

  -- Salle
  insert into "EventVenue"(id, "hotelId", name, capacity, "seatingModes", "basePrice", currency, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Salle Grand Saphir', 200, '{"theatre":200,"banquet":120,"u":80}'::jsonb, 50000, 'XOF', now()
  where not exists (select 1 from "EventVenue" where "hotelId"=h_co and name='Salle Grand Saphir') returning id into venue_id;

  -- Équipement
  insert into "EventEquipment"(id, "hotelId", name, category, quantity, available, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Projecteur HD', 'AV', 2, 2, now()
  where not exists (select 1 from "EventEquipment" where "hotelId"=h_co and name='Projecteur HD');

  -- Groupe
  insert into "EventGroup"(id, "hotelId", "companyId", name, type, "contactName", "totalRooms", "arrivalDate", "departureDate", status, "updatedAt")
  select gen_random_uuid()::text, h_co, co, 'Séminaire Banque Afrique', 'CORPORATE', 'M. Koffi', 15,
    now() + interval '20 days', now() + interval '23 days', 'CONFIRMED', now()
  where not exists (select 1 from "EventGroup" where "hotelId"=h_co and name='Séminaire Banque Afrique') returning id into grp_id;

  -- Événement (séminaire) dans la salle
  insert into "HotelEvent"(id, "hotelId", "groupId", "venueId", name, "eventType", "startAt", "endAt", "expectedAttendees", status, "updatedAt")
  select gen_random_uuid()::text, h_co, grp_id, venue_id, 'Séminaire annuel', 'SEMINAR',
    now() + interval '21 days', now() + interval '21 days' + interval '8 hours', 150, 'CONFIRMED', now()
  where grp_id is not null and venue_id is not null
    and not exists (select 1 from "HotelEvent" where "hotelId"=h_co and name='Séminaire annuel') returning id into evt_id;

  -- Contrat / devis
  if grp_id is not null then
    insert into "EventContract"(id, "hotelId", "groupId", title, "contractType", amount, status, "updatedAt")
    select gen_random_uuid()::text, h_co, grp_id, 'Contrat séminaire', 'CONTRACT', 1250000, 'ACCEPTED', now()
    where not exists (select 1 from "EventContract" where "hotelId"=h_co and title='Contrat séminaire');

    -- Ordre de service (restauration)
    insert into "EventServiceOrder"(id, "hotelId", "groupId", "eventId", department, title, detail, "updatedAt")
    select gen_random_uuid()::text, h_co, grp_id, evt_id, 'catering', 'Banquet 150 couverts', 'Dîner de gala + cocktail', now()
    where grp_id is not null and not exists (select 1 from "EventServiceOrder" where "hotelId"=h_co and title='Banquet 150 couverts');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "EventVenue" v where v."hotelId"=h.id) as salles,
  (select count(*) from "EventEquipment" e where e."hotelId"=h.id) as equipements,
  (select count(*) from "EventGroup" g where g."hotelId"=h.id) as groupes,
  (select count(*) from "HotelEvent" e where e."hotelId"=h.id) as evenements,
  (select count(*) from "EventServiceOrder" o where o."hotelId"=h.id) as ordres
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
