-- ============================================================================
-- AfriHost AI — Jeu de démonstration : chambres & inventaire physique (Module 6)
-- Fichier : database/seed/06-demo-rooms.sql
--
-- Ajoute des CHAMBRES physiques aux 2 hôtels de démo (Cotonou, Dakar), chacune
-- liée à un TYPE DE CHAMBRE du Module 5, avec des ÉTATS variés (dont certains
-- OUT_OF_ORDER pour démontrer la machine à états).
--
-- IDEMPOTENT : n'insère une chambre que si le numéro n'existe pas déjà dans l'hôtel.
-- NB : nécessite pgcrypto (gen_random_uuid).
-- ============================================================================

do $$
declare
  h text;
  rt_std text; rt_suite text; rt_fam text;
  v_status text;
begin
  -- Pour chaque hôtel de démo
  for h in select "id" from "Hotel" where "slug" like 'demo-%' loop
    -- Récupérer les types de chambres de CET hôtel
    select "id" into rt_std from "RoomType" where "hotelId"=h and name='Chambre Standard';
    select "id" into rt_suite from "RoomType" where "hotelId"=h and name='Suite Exécutive';
    select "id" into rt_fam from "RoomType" where "hotelId"=h and name='Chambre Familiale';

    -- Chambre Standard : 101 (disponible), 102 (disponible), 103 (sale - DIRTY)
    if rt_std is not null then
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "updatedAt")
      select gen_random_uuid()::text, h, rt_std, '101', 1, 'AVAILABLE', now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='101');
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "updatedAt")
      select gen_random_uuid()::text, h, rt_std, '102', 1, 'AVAILABLE', now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='102');
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "updatedAt")
      select gen_random_uuid()::text, h, rt_std, '103', 1, 'DIRTY', now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='103');
    end if;

    -- Suite Exécutive : 201 (disponible), 202 (occupée)
    if rt_suite is not null then
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "updatedAt")
      select gen_random_uuid()::text, h, rt_suite, '201', 2, 'AVAILABLE', now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='201');
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "updatedAt")
      select gen_random_uuid()::text, h, rt_suite, '202', 2, 'OCCUPIED', now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='202');
    end if;

    -- Chambre Familiale : 301 (hors service - maintenance), 302 (disponible)
    if rt_fam is not null then
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "isOutOfOrder", "updatedAt")
      select gen_random_uuid()::text, h, rt_fam, '301', 3, 'OUT_OF_ORDER', true, now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='301');
      insert into "Room"(id, "hotelId", "roomTypeId", number, floor, status, "updatedAt")
      select gen_random_uuid()::text, h, rt_fam, '302', 3, 'AVAILABLE', now()
      where not exists (select 1 from "Room" where "hotelId"=h and number='302');
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Récapitulatif
-- ---------------------------------------------------------------------------
select h.name as hotel, count(r.id) as chambres,
  count(*) filter (where r.status='AVAILABLE') as disponibles,
  count(*) filter (where r.status='OUT_OF_ORDER') as hors_service
from "Hotel" h join "Room" r on r."hotelId"=h.id
where h.name like 'Hôtel Démo%' group by h.name order by h.name;
