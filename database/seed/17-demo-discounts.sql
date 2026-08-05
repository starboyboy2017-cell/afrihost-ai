-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Remises, promotions & coupons (Module 17)
-- Fichier : database/seed/17-demo-discounts.sql
--
-- Crée pour l'hôtel Cotonou :
--   * une règle de remise (10% POS) ;
--   * une règle de remise (fixe 2000, BILLING) ;
--   * un coupon généré à partir de la première règle.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  rule1 text; rule2 text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Règle 10% POS
  insert into "DiscountRule"(id, "hotelId", name, code, type, value, scope, "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Promo 10% restaurant', 'PROMO10', 'PERCENT', 10, 'POS', true, now()
  where not exists (select 1 from "DiscountRule" where "hotelId"=h_co and code='PROMO10') returning id into rule1;
  if rule1 is null then select "id" into rule1 from "DiscountRule" where "hotelId"=h_co and code='PROMO10'; end if;

  -- Règle fixe 2000 BILLING
  insert into "DiscountRule"(id, "hotelId", name, code, type, value, scope, "roleCap", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Remise fidélité', 'FIDEL2000', 'FIXED', 2000, 'BILLING', 5000, true, now()
  where not exists (select 1 from "DiscountRule" where "hotelId"=h_co and code='FIDEL2000') returning id into rule2;
  if rule2 is null then select "id" into rule2 from "DiscountRule" where "hotelId"=h_co and code='FIDEL2000'; end if;

  -- Coupon généré depuis la règle 1
  insert into "Coupon"(id, "hotelId", "ruleId", code, status, "singleUse", "updatedAt")
  select gen_random_uuid()::text, h_co, rule1, 'PROMO10-AB12CD', 'ACTIVE', true, now()
  where not exists (select 1 from "Coupon" where "hotelId"=h_co and code='PROMO10-AB12CD');
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "DiscountRule" r where r."hotelId"=h.id) as regles,
  (select count(*) from "Coupon" c where c."hotelId"=h.id) as coupons
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
