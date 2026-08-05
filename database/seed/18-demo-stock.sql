-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Stock & inventaire (Module 18)
-- Fichier : database/seed/18-demo-stock.sql
--
-- Crée pour l'hôtel Cotonou :
--   * un entrepôt (dépôt principal) ;
--   * un fournisseur ;
--   * des articles de stock avec seuils et quantités ;
--   * un mouvement de réception.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  wh text; sup text; p1 text; p2 text; si1 text; si2 text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Entrepôt
  insert into "Warehouse"(id, "hotelId", name, location, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Dépôt principal', 'Sous-sol', now()
  where not exists (select 1 from "Warehouse" where "hotelId"=h_co and name='Dépôt principal') returning id into wh;
  if wh is null then select "id" into wh from "Warehouse" where "hotelId"=h_co and name='Dépôt principal'; end if;

  -- Fournisseur
  insert into "Supplier"(id, "hotelId", name, phone, email, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Grossiste Bénin', '+2290101', 'contact@grossiste.bj', now()
  where not exists (select 1 from "Supplier" where "hotelId"=h_co and name='Grossiste Bénin') returning id into sup;
  if sup is null then select "id" into sup from "Supplier" where "hotelId"=h_co and name='Grossiste Bénin'; end if;

  -- Articles (produits de démo existants)
  select "id" into p1 from "Product" where "hotelId"=h_co and name='Poulet braisé';
  select "id" into p2 from "Product" where "hotelId"=h_co and name='Jus de gingembre';

  -- Stock avec seuils + quantités
  if p1 is not null then
    insert into "StockItem"(id, "hotelId", "productId", "warehouseId", quantity, "minLevel", "maxLevel", "unitCost", "updatedAt")
    select gen_random_uuid()::text, h_co, p1, wh, 40, 10, 100, 2500, now()
    where not exists (select 1 from "StockItem" where "hotelId"=h_co and "productId"=p1);
  end if;
  if p2 is not null then
    insert into "StockItem"(id, "hotelId", "productId", "warehouseId", quantity, "minLevel", "maxLevel", "unitCost", "updatedAt")
    select gen_random_uuid()::text, h_co, p2, wh, 8, 20, 200, 600, now()
    where not exists (select 1 from "StockItem" where "hotelId"=h_co and "productId"=p2);
  end if;

  -- Mouvement de réception (pour le journal)
  if p1 is not null then
    insert into "StockMovement"(id, "hotelId", "productId", "warehouseId", type, quantity, "unitCost", note, "createdAt")
    values (gen_random_uuid()::text, h_co, p1, wh, 'RECEIPT', 40, 2500, 'Réception initiale', now() - interval '1 day');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "Warehouse" w where w."hotelId"=h.id) as entrepots,
  (select count(*) from "Supplier" s where s."hotelId"=h.id) as fournisseurs,
  (select count(*) from "StockItem" i where i."hotelId"=h.id) as articles_stock
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
