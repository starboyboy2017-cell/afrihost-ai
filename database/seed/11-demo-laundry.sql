-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Blanchisserie (Module 11)
-- Fichier : database/seed/11-demo-laundry.sql
--
-- Crée pour l'hôtel Cotonou :
--   * des types de linge (Serviette, Drap, Taie) ;
--   * des pièces de linge à différents états ;
--   * un lot de lavage (interne) ;
--   * une perte (détérioration).
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  t_serv text; t_drap text; t_taie text;
  i1 text; i2 text; i3 text;
  lot text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Types de linge
  insert into "LaundryItemType"(id, "hotelId", name, unit, "updatedAt")
  values (gen_random_uuid()::text, h_co, 'Serviette', 'pièce', now())
  on conflict do nothing returning id into t_serv;
  if t_serv is null then select "id" into t_serv from "LaundryItemType" where "hotelId"=h_co and name='Serviette'; end if;

  insert into "LaundryItemType"(id, "hotelId", name, unit, "updatedAt")
  values (gen_random_uuid()::text, h_co, 'Drap', 'pièce', now())
  on conflict do nothing;
  insert into "LaundryItemType"(id, "hotelId", name, unit, "updatedAt")
  values (gen_random_uuid()::text, h_co, 'Taie', 'pièce', now())
  on conflict do nothing;
  select "id" into t_drap from "LaundryItemType" where "hotelId"=h_co and name='Drap';
  select "id" into t_taie from "LaundryItemType" where "hotelId"=h_co and name='Taie';

  -- Pièces de linge (états variés)
  insert into "LaundryItem"(id, "hotelId", "itemTypeId", code, state, "updatedAt")
  select gen_random_uuid()::text, h_co, t_serv, 'SV-001', 'CLEAN', now()
  where not exists (select 1 from "LaundryItem" where "hotelId"=h_co and code='SV-001');
  insert into "LaundryItem"(id, "hotelId", "itemTypeId", code, state, "updatedAt")
  select gen_random_uuid()::text, h_co, t_serv, 'SV-002', 'DIRTY', now()
  where not exists (select 1 from "LaundryItem" where "hotelId"=h_co and code='SV-002');
  insert into "LaundryItem"(id, "hotelId", "itemTypeId", code, state, "updatedAt")
  select gen_random_uuid()::text, h_co, t_drap, 'DR-001', 'WASHING', now()
  where not exists (select 1 from "LaundryItem" where "hotelId"=h_co and code='DR-001');

  -- Lot de lavage (interne)
  insert into "LaundryBatch"(id, "hotelId", code, mode, "responsible", "startedAt", "updatedAt")
  values (gen_random_uuid()::text, h_co, 'LB-2026-0001', 'INTERNAL', 'agent-linge', now() - interval '1 hour', now())
  on conflict do nothing;

  -- Une perte (détérioration) sur une pièce
  select "id" into i3 from "LaundryItem" where "hotelId"=h_co and code='SV-002' limit 1;
  if i3 is not null then
    insert into "LaundryLoss"(id, "hotelId", "itemId", reason, note, "costValue", "createdAt")
    values (gen_random_uuid()::text, h_co, i3, 'DAMAGED', 'Serviette déchirée', 500, now());
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "LaundryItemType" t where t."hotelId"=h.id) as types,
  (select count(*) from "LaundryItem" i where i."hotelId"=h.id) as pieces,
  (select count(*) from "LaundryBatch" b where b."hotelId"=h.id) as lots
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
