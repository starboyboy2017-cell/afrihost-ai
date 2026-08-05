-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Maintenance & interventions (Module 10)
-- Fichier : database/seed/10-demo-maintenance.sql
--
-- Simule :
--   * un ticket OPEN sur la chambre 201 (Suite, Cotonou) — priorité HIGH ;
--   * un ticket ASSIGNED/RESOLVED avec mise hors service puis restauration.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text; room201 text; room301 text;
  r1 text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05/06 requis)'; end if;

  select "id" into room201 from "Room" where "hotelId"=h_co and number='201';
  select "id" into room301 from "Room" where "hotelId"=h_co and number='301';

  -- Ticket 1 : OPEN sur chambre 201 (problème clim), chambre hors service
  if room201 is not null then
    select "id" into r1 from "MaintenanceRequest" where "hotelId"=h_co and "title"='Climatisation en panne - 201' limit 1;
    if r1 is null then
      insert into "MaintenanceRequest"(id, "hotelId", "roomId", title, description, status, priority, "putRoomOutOfOrder", "updatedAt")
      values (gen_random_uuid()::text, h_co, room201, 'Climatisation en panne - 201', 'Climatiseur ne refroidit plus', 'OPEN', 'HIGH', true, now());
      update "Room" set status='OUT_OF_ORDER', "isOutOfOrder"=true where id=room201;
    end if;
  end if;

  -- Ticket 2 : RESOLVED/CLOSED sur chambre 301 (maintenance faite, chambre restaurée)
  if room301 is not null then
    select "id" into r1 from "MaintenanceRequest" where "hotelId"=h_co and "title"='Robinets fuite - 301' limit 1;
    if r1 is null then
      insert into "MaintenanceRequest"(id, "hotelId", "roomId", title, description, status, priority, "putRoomOutOfOrder", "roomRestored", "resolvedAt", "closedAt", "updatedAt")
      values (gen_random_uuid()::text, h_co, room301, 'Robinets fuite - 301', 'Remplacé les joints', 'CLOSED', 'MEDIUM', true, true, now() - interval '1 day', now(), now());
      -- Chambre remise en service
      update "Room" set status='AVAILABLE', "isOutOfOrder"=false, "isOutOfService"=false where id=room301;
    end if;
  end if;
end $$;

-- Récapitulatif
select h.name as hotel, count(r.id) as tickets, count(r.id) filter (where r.status='OPEN') as ouverts
from "Hotel" h left join "MaintenanceRequest" r on r."hotelId"=h.id
where h.name like 'Hôtel Démo%' group by h.name order by h.name;
