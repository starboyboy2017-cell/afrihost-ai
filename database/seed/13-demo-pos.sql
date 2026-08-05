-- ============================================================================
-- AfriHost AI — Jeu de démonstration : POS Restaurant (Module 13)
-- Fichier : database/seed/13-demo-pos.sql
--
-- Crée pour l'hôtel Cotonou :
--   * un point de vente (restaurant) ;
--   * des produits de restauration ;
--   * un menu avec des lignes ;
--   * une commande encaissée (PAID) pour le chiffre d'affaires.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  pp text; menu text;
  prod1 text; prod2 text; prod3 text;
  ord text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Point de vente
  insert into "PosPoint"(id, "hotelId", name, kind, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Restaurant Le Baobab', 'RESTAURANT', now()
  where not exists (select 1 from "PosPoint" where "hotelId"=h_co and name='Restaurant Le Baobab') returning id into pp;
  if pp is null then select "id" into pp from "PosPoint" where "hotelId"=h_co and name='Restaurant Le Baobab'; end if;

  -- Produits de restauration
  insert into "Product"(id, "hotelId", name, category, price, currency, "taxRate", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Poulet braisé', 'restaurant', 5000, 'XOF', 0.18, now()
  where not exists (select 1 from "Product" where "hotelId"=h_co and name='Poulet braisé') returning id into prod1;
  insert into "Product"(id, "hotelId", name, category, price, currency, "taxRate", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Jus de gingembre', 'restaurant', 1500, 'XOF', 0.18, now()
  where not exists (select 1 from "Product" where "hotelId"=h_co and name='Jus de gingembre');
  insert into "Product"(id, "hotelId", name, category, price, currency, "taxRate", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Attiéké poisson', 'restaurant', 4500, 'XOF', 0.18, now()
  where not exists (select 1 from "Product" where "hotelId"=h_co and name='Attiéké poisson');
  select "id" into prod2 from "Product" where "hotelId"=h_co and name='Jus de gingembre';
  select "id" into prod3 from "Product" where "hotelId"=h_co and name='Attiéké poisson';

  -- Menu + lignes
  insert into "PosMenu"(id, "hotelId", "posPointId", name, "updatedAt")
  select gen_random_uuid()::text, h_co, pp, 'Menu du jour', now()
  where not exists (select 1 from "PosMenu" where "hotelId"=h_co and "posPointId"=pp and name='Menu du jour') returning id into menu;
  if menu is null then select "id" into menu from "PosMenu" where "hotelId"=h_co and "posPointId"=pp and name='Menu du jour'; end if;

  insert into "PosMenuLine"(id, "menuId", "productId", price, currency, "taxRate")
  select gen_random_uuid()::text, menu, p, pr, 'XOF', 0.18
  from (values (prod1, 5000), (prod2, 1500), (prod3, 4500)) as v(p, pr)
  where not exists (select 1 from "PosMenuLine" where "menuId"=menu and "productId"=v.p);

  -- Commande encaissée (PAID) pour le chiffre d'affaires
  insert into "PosOrder"(id, "hotelId", "posPointId", "orderRef", status, subtotal, "taxAmount", "discountAmount", total, currency, "updatedAt")
  values (gen_random_uuid()::text, h_co, pp, 'PO-2026-0001', 'PAID', 6500, 1170, 0, 7670, 'XOF', now())
  on conflict do nothing returning id into ord;

  if ord is not null then
    insert into "PosOrderLine"(id, "orderId", "productId", "productName", quantity, "unitPrice", "lineTotal", "taxRate")
    select gen_random_uuid()::text, ord, p, n, q, u, u*q, 0.18
    from (values (prod1, 'Poulet braisé', 1, 5000), (prod2, 'Jus de gingembre', 1, 1500)) as v(p, n, q, u)
    where not exists (select 1 from "PosOrderLine" where "orderId"=ord and "productId"=v.p);
    insert into "PosPayment"(id, "hotelId", "orderId", amount, method, "receivedBy")
    values (gen_random_uuid()::text, h_co, ord, 7670, 'CASH', 'demo');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "PosPoint" p where p."hotelId"=h.id) as points,
  (select count(*) from "PosOrder" o where o."hotelId"=h.id) as commandes,
  (select coalesce(sum(o.total),0) from "PosOrder" o where o."hotelId"=h.id and o.status='PAID') as chiffre_affaires
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
