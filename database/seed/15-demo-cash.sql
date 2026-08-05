-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Caisse (Module 15)
-- Fichier : database/seed/15-demo-cash.sql
--
-- Crée pour l'hôtel Cotonou :
--   * une caisse (réception) ;
--   * une session ouverte avec fonds d'ouverture ;
--   * des mouvements (SALE cash, SALE mobile money).
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  cr text; cs text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Caisse
  insert into "CashRegister"(id, "hotelId", name, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Caisse réception', now()
  where not exists (select 1 from "CashRegister" where "hotelId"=h_co and name='Caisse réception') returning id into cr;
  if cr is null then select "id" into cr from "CashRegister" where "hotelId"=h_co and name='Caisse réception'; end if;

  -- Session ouverte (si aucune ouverte)
  select "id" into cs from "CashSession" where "hotelId"=h_co and status='OPEN' limit 1;
  if cs is null then
    insert into "CashSession"(id, "hotelId", "registerId", "cashierId", status, "openingAmount", "updatedAt")
    values (gen_random_uuid()::text, h_co, cr, 'demo-cashier', 'OPEN', 10000, now())
    returning id into cs;

    -- Mouvements (ouverture + ventes)
    insert into "CashMovement"(id, "hotelId", "sessionId", type, method, amount, "createdBy", "createdAt")
    values
      (gen_random_uuid()::text, h_co, cs, 'OPENING', 'CASH', 10000, 'demo-cashier', now() - interval '2 hours'),
      (gen_random_uuid()::text, h_co, cs, 'SALE', 'CASH', 7670, 'demo-cashier', now() - interval '1 hour'),
      (gen_random_uuid()::text, h_co, cs, 'SALE', 'MOBILE_MONEY', 4500, 'demo-cashier', now() - interval '30 minutes');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "CashRegister" r where r."hotelId"=h.id) as caisses,
  (select count(*) from "CashSession" s where s."hotelId"=h.id and s.status='OPEN') as sessions_ouvertes,
  (select count(*) from "CashMovement" m where m."hotelId"=h.id) as mouvements
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
