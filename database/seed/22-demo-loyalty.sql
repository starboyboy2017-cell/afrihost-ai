-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Programme de fidélité (Module 22)
-- Fichier : database/seed/22-demo-loyalty.sql
--
-- Pour l'hôtel Cotonou :
--   * un programme "AfriPoints" (moteur paramétrable, aucun calcul en dur) ;
--   * niveaux Bronze / Argent / Or (règles d'accès configurables) ;
--   * règles : 1 pt / XOF dépensé, 100 pts / nuit, bonus bienvenue & parrainage ;
--   * récompenses : réduction, nuit gratuite, upgrade, service, bon d'achat ;
--   * bonus : bienvenue, anniversaire, parrainage, campagne ;
--   * adhésion + attribution de points de démonstration à un client.
--
-- IDEMPOTENT. NB : pgcrypto requis (gen_random_uuid), exécuter après seed 05.
-- ============================================================================

do $$
declare
  h_co text; g text; p text; m text;
  t_br text; t_ar text; t_or text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into g from "Guest" where "hotelId"=h_co limit 1;

  -- Programme
  insert into "LoyaltyProgram"(id, "hotelId", "organisationId", name, scope, currency,
    "pointsPerSpend", "pointsPerNight", "validityDays", "updatedAt")
  select gen_random_uuid()::text, h_co, o.id, 'AfriPoints', 'HOTEL', 'XOF', 1, 100, 365, now()
  from "Organisation" o where not exists (
    select 1 from "LoyaltyProgram" where "hotelId"=h_co and name='AfriPoints'
  ) returning id into p;

  if p is not null then
    -- Lien programme → hôtel gestionnaire
    insert into "LoyaltyProgramHotel"(id, "programId", "hotelId")
    values (gen_random_uuid()::text, p, h_co);

    -- Niveaux
    insert into "LoyaltyTier"(id, "programId", "hotelId", code, name, rank, "minPoints", "minSpend", benefits, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'BRONZE', 'Bronze', 1, 0, 0, '{"lateCheckout":false,"welcomeDrink":false}'::jsonb, now()
    where not exists (select 1 from "LoyaltyTier" where "programId"=p and code='BRONZE') returning id into t_br;
    insert into "LoyaltyTier"(id, "programId", "hotelId", code, name, rank, "minPoints", "minSpend", benefits, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'ARGENT', 'Argent', 2, 1000, 100000, '{"lateCheckout":true,"welcomeDrink":true}'::jsonb, now()
    where not exists (select 1 from "LoyaltyTier" where "programId"=p and code='ARGENT') returning id into t_ar;
    insert into "LoyaltyTier"(id, "programId", "hotelId", code, name, rank, "minPoints", "minSpend", benefits, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'OR', 'Or', 3, 5000, 500000, '{"lateCheckout":true,"welcomeDrink":true,"freeUpgrade":true}'::jsonb, now()
    where not exists (select 1 from "LoyaltyTier" where "programId"=p and code='OR') returning id into t_or;

    -- Règles (moteur paramétrable)
    insert into "LoyaltyRule"(id, "programId", "hotelId", name, trigger, condition, "pointsPerUnit", "updatedAt")
    select gen_random_uuid()::text, p, h_co, '1 pt par XOF dépensé', 'spend_earned', '{"field":"amount","op":"gte","value":0}'::jsonb, 1, now()
    where not exists (select 1 from "LoyaltyRule" where "programId"=p and name='1 pt par XOF dépensé');
    insert into "LoyaltyRule"(id, "programId", "hotelId", name, trigger, "pointsPerUnit", "updatedAt")
    select gen_random_uuid()::text, p, h_co, '100 pts par nuit', 'night_earned', 100, now()
    where not exists (select 1 from "LoyaltyRule" where "programId"=p and name='100 pts par nuit');
    insert into "LoyaltyRule"(id, "programId", "hotelId", name, trigger, points, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Bonus de bienvenue', 'welcome', 500, now()
    where not exists (select 1 from "LoyaltyRule" where "programId"=p and name='Bonus de bienvenue');
    insert into "LoyaltyRule"(id, "programId", "hotelId", name, trigger, condition, points, "multiplier", "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'x2 points parrainage', 'referral', '{"field":"count","op":"gte","value":1}'::jsonb, 250, 2, now()
    where not exists (select 1 from "LoyaltyRule" where "programId"=p and name='x2 points parrainage');

    -- Récompenses
    insert into "LoyaltyReward"(id, "programId", "hotelId", name, type, "pointsCost", value, description, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Réduction 10%', 'DISCOUNT', 2000, 10000, 'Remise de 10% sur la note', now()
    where not exists (select 1 from "LoyaltyReward" where "programId"=p and name='Réduction 10%');
    insert into "LoyaltyReward"(id, "programId", "hotelId", name, type, "pointsCost", value, description, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Nuit gratuite', 'FREE_NIGHT', 5000, 40000, 'Une nuit offerte en chambre standard', now()
    where not exists (select 1 from "LoyaltyReward" where "programId"=p and name='Nuit gratuite');
    insert into "LoyaltyReward"(id, "programId", "hotelId", name, type, "pointsCost", value, description, config, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Upgrade suite', 'UPGRADE', 3000, 20000, 'Surclassement en suite', '{"category":"suite"}'::jsonb, now()
    where not exists (select 1 from "LoyaltyReward" where "programId"=p and name='Upgrade suite');
    insert into "LoyaltyReward"(id, "programId", "hotelId", name, type, "pointsCost", value, description, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Massage offert', 'SERVICE', 1500, 8000, 'Un soin spa', now()
    where not exists (select 1 from "LoyaltyReward" where "programId"=p and name='Massage offert');
    insert into "LoyaltyReward"(id, "programId", "hotelId", name, type, "pointsCost", value, description, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Bon d''achat', 'VOUCHER', 1000, 5000, 'Bon utilisable au restaurant', now()
    where not exists (select 1 from "LoyaltyReward" where "programId"=p and name='Bon d''achat');

    -- Bonus
    insert into "LoyaltyBonus"(id, "programId", "hotelId", name, "bonusType", points, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Bienvenue', 'WELCOME', 500, now()
    where not exists (select 1 from "LoyaltyBonus" where "programId"=p and name='Bienvenue');
    insert into "LoyaltyBonus"(id, "programId", "hotelId", name, "bonusType", points, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Anniversaire', 'BIRTHDAY', 300, now()
    where not exists (select 1 from "LoyaltyBonus" where "programId"=p and name='Anniversaire');
    insert into "LoyaltyBonus"(id, "programId", "hotelId", name, "bonusType", points, "updatedAt")
    select gen_random_uuid()::text, p, h_co, 'Parrainage', 'REFERRAL', 250, now()
    where not exists (select 1 from "LoyaltyBonus" where "programId"=p and name='Parrainage');

    -- Adhésion d'un client de démonstration + attribution de points
    if g is not null and t_br is not null then
      insert into "LoyaltyMember"(id, "programId", "hotelId", "guestId", "tierId", "pointsBalance", "lifetimePoints", "updatedAt")
      select gen_random_uuid()::text, p, h_co, g, t_br, 0, 0, now()
      where not exists (select 1 from "LoyaltyMember" where "programId"=p and "guestId"=g) returning id into m;

      if m is not null then
        -- Attribution de démonstration : dépense 200 000 XOF → 200 000 pts (règle 1pt/XOF)
        update "LoyaltyMember" set "pointsBalance"="pointsBalance"+200000, "lifetimePoints"="lifetimePoints"+200000, "lastEarnAt"=now() where id=m;
        -- Niveau atteint (Or : >= 5 000 pts de vie) — cohérent avec le service
        update "LoyaltyMember" set "tierId"=t_or where id=m;
        insert into "LoyaltyTransaction"(id, "guestId", "memberId", "programId", "hotelId", type, points, "balanceAfter", reference, description, "sourceModule")
        values (gen_random_uuid()::text, g, m, p, h_co, 'EARN', 200000, 200000, 'demo-billing', '1 pt par XOF dépensé (démo)', 'billing');
        insert into "LoyaltyTransaction"(id, "guestId", "memberId", "programId", "hotelId", type, points, "balanceAfter", reference, description, "sourceModule")
        values (gen_random_uuid()::text, g, m, p, h_co, 'EARN', 500, 200500, 'demo-welcome', 'Bonus de bienvenue (démo)', 'loyalty');
        update "Guest" set "loyaltyPoints"=200500, "loyaltyTier"='OR' where id=g;
        -- Notification de démonstration
        insert into "LoyaltyNotification"(id, "memberId", "guestId", "hotelId", type, title, body)
        values (gen_random_uuid()::text, m, g, h_co, 'WELCOME', 'Bienvenue dans AfriPoints', 'Vous êtes membre du programme AfriPoints.');
      end if;
    end if;
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "LoyaltyProgram" p where p."hotelId"=h.id) as programmes,
  (select count(*) from "LoyaltyTier" t where t."hotelId"=h.id) as niveaux,
  (select count(*) from "LoyaltyRule" r where r."hotelId"=h.id) as regles,
  (select count(*) from "LoyaltyReward" rw where rw."hotelId"=h.id) as recompenses,
  (select count(*) from "LoyaltyMember" m where m."hotelId"=h.id) as membres
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
