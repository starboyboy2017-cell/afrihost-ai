-- ============================================================================
-- AfriHost AI — Jeu de démonstration : check-in / check-out (Module 7)
-- Fichier : database/seed/07-demo-stays.sql
--
-- Simule un FLUX COMPLET sur l'hôtel Cotonou :
--   1. crée un client (guest) de démo ;
--   2. crée une réservation CONFIRMED sur la chambre 102 (réservée) ;
--   3. CHECK-IN : occupe la chambre 102 (OCCUPIED) + crée le séjour ACTIVE ;
--   4. crée une 2e réservation sur une autre chambre pour démontrer la liste.
--
-- IDEMPOTENT. NB : nécessite pgcrypto.
-- ============================================================================

do $$
declare
  v_org text; h_co text;
  r_std text; room102 text;
  gid text; rid text;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if v_org is null or h_co is null then
    raise exception 'Jeu de démo absent. Exécutez d''abord les seeds 05 et 06.';
  end if;

  -- Chambre 102 (Standard) de Cotonou
  select "id" into room102 from "Room" where "hotelId"=h_co and number='102';
  select "id" into r_std from "RoomType" where "hotelId"=h_co and name='Chambre Standard';

  -- Client de démo
  insert into "Guest"(id, "organisationId", "hotelId", "firstName", "lastName", email, phone, nationality, "updatedAt")
  values (gen_random_uuid()::text, v_org, h_co, 'Amadou', 'Diallo', 'amadou@demo.local', '+22900000001', 'BJ', now())
  returning id into gid;

  -- Réservation CONFIRMED sur chambre 102 (statut chambre → RESERVED)
  update "Room" set status='RESERVED' where id=room102;
  insert into "Reservation"(id, "hotelId", "guestId", "roomId", "roomTypeId", "bookingRef", source, status, "arrivalDate", "departureDate", adults, children, amount, "taxAmount", "discountAmount", currency, "updatedAt")
  values (gen_random_uuid()::text, h_co, gid, room102, r_std, 'AH-2026-90001', 'DIRECT', 'CONFIRMED', now()::date, now()::date + interval '3 days', 2, 0, 17700, 2700, 0, 'XOF', now())
  returning id into rid;

  -- CHECK-IN : occupe la chambre + crée le séjour ACTIVE
  update "Room" set status='OCCUPIED' where id=room102;
  insert into "Stay"(id, "hotelId", "reservationId", "guestId", "roomId", status, "checkInAt", "departureDate", "updatedAt")
  values (gen_random_uuid()::text, h_co, rid, gid, room102, 'ACTIVE', now(), now()::date + interval '3 days', now());

  -- 2e réservation CONFIRMED (sans check-in) sur chambre 302 pour la liste
  insert into "Reservation"(id, "hotelId", "bookingRef", source, status, "arrivalDate", "departureDate", adults, children, amount, "taxAmount", "discountAmount", currency, "updatedAt")
  select gen_random_uuid()::text, h_co, 'AH-2026-90002', 'WEBSITE', 'CONFIRMED', now()::date + interval '1 day', now()::date + interval '4 days', 2, 1, 24000, 4320, 0, 'XOF', now()
  where not exists (select 1 from "Reservation" where "bookingRef"='AH-2026-90002');
end $$;

-- Récapitulatif
select h.name as hotel, count(s.id) as sejours_actifs
from "Hotel" h left join "Stay" s on s."hotelId"=h.id and s.status='ACTIVE'
where h.name like 'Hôtel Démo%' group by h.name order by h.name;
