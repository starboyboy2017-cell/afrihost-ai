-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Cuisine (Module 14)
-- Fichier : database/seed/14-demo-kitchen.sql
--
-- Crée pour l'hôtel Cotonou :
--   * des postes de cuisine (Grillard, Plats, Room Service) ;
--   * un ordre de préparation reçu depuis la commande POS de démo (PO-2026-0001),
--     avec ses lignes, au statut PREPARING.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text; pos_order text;
  st_grill text; st_plat text; st_rs text;
  ko text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into pos_order from "PosOrder" where "hotelId"=h_co and "orderRef"='PO-2026-0001';

  -- Postes de cuisine
  insert into "KitchenStation"(id, "hotelId", name, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Grillard', now()
  where not exists (select 1 from "KitchenStation" where "hotelId"=h_co and name='Grillard') returning id into st_grill;
  insert into "KitchenStation"(id, "hotelId", name, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Plats', now()
  where not exists (select 1 from "KitchenStation" where "hotelId"=h_co and name='Plats');
  insert into "KitchenStation"(id, "hotelId", name, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Room Service', now()
  where not exists (select 1 from "KitchenStation" where "hotelId"=h_co and name='Room Service');
  select "id" into st_plat from "KitchenStation" where "hotelId"=h_co and name='Plats';

  -- Ordre de préparation reçu depuis la commande POS de démo
  if pos_order is not null then
    insert into "KitchenOrder"(id, "hotelId", "posOrderId", "stationId", "kitchenRef", status, priority, "receivedAt", "startedAt", "updatedAt")
    select gen_random_uuid()::text, h_co, pos_order, st_plat, 'KO-2026-0001', 'PREPARING', 'HIGH', now() - interval '10 minutes', now() - interval '8 minutes', now()
    where not exists (select 1 from "KitchenOrder" where "hotelId"=h_co and "kitchenRef"='KO-2026-0001') returning id into ko;

    if ko is not null then
      -- Reprendre les lignes de la commande POS
      insert into "KitchenOrderLine"(id, "kitchenOrderId", "productId", "productName", quantity)
      select gen_random_uuid()::text, ko, l."productId", l."productName", l.quantity
      from "PosOrderLine" l where l."orderId"=pos_order;
      insert into "KitchenOrderEvent"(id, "kitchenOrderId", action, actor, "createdAt")
      values (gen_random_uuid()::text, ko, 'received', 'pos', now() - interval '10 minutes'),
             (gen_random_uuid()::text, ko, 'preparing', 'cuisine', now() - interval '8 minutes');
    end if;
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "KitchenStation" s where s."hotelId"=h.id) as postes,
  (select count(*) from "KitchenOrder" o where o."hotelId"=h.id) as ordres
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
