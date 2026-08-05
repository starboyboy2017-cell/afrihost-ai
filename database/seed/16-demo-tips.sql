-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Pourboires (Module 16)
-- Fichier : database/seed/16-demo-tips.sql
--
-- Crée pour l'hôtel Cotonou :
--   * une règle de répartition configurable (Serveur 60 / Équipe 30 / Cuisine 10) ;
--   * un pourboire individuel (espèces) ;
--   * un pourboire collectif avec répartitions.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
  rule_id text; tip1 text; tip2 text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Règle de répartition
  insert into "TipRule"(id, "hotelId", name, "serverPercent", "teamPercent", "kitchenPercent", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Standard', 60, 30, 10, now()
  where not exists (select 1 from "TipRule" where "hotelId"=h_co and name='Standard') returning id into rule_id;
  if rule_id is null then select "id" into rule_id from "TipRule" where "hotelId"=h_co and name='Standard'; end if;

  -- Pourboire individuel (espèces) — distribué
  insert into "Tip"(id, "hotelId", type, status, amount, method, "validatedAt", "distributedAt", "updatedAt")
  select gen_random_uuid()::text, h_co, 'INDIVIDUAL', 'DISTRIBUTED', 2000, 'CASH', now() - interval '1 day', now() - interval '20 hours', now()
  where not exists (select 1 from "Tip" where "hotelId"=h_co and amount=2000 and type='INDIVIDUAL') returning id into tip1;
  if tip1 is not null then
    insert into "TipAllocation"(id, "tipId", recipient, amount) values (gen_random_uuid()::text, tip1, 'serveur-1', 2000);
  end if;

  -- Pourboire collectif — en attente de validation
  insert into "Tip"(id, "hotelId", type, status, amount, method, "tipRuleId", "updatedAt")
  select gen_random_uuid()::text, h_co, 'COLLECTIVE', 'PENDING', 3000, 'MOBILE_MONEY', rule_id, now()
  where not exists (select 1 from "Tip" where "hotelId"=h_co and amount=3000 and type='COLLECTIVE') returning id into tip2;
  if tip2 is not null then
    insert into "TipAllocation"(id, "tipId", recipient, amount) values
      (gen_random_uuid()::text, tip2, 'server', 1800),
      (gen_random_uuid()::text, tip2, 'team', 900),
      (gen_random_uuid()::text, tip2, 'kitchen', 300);
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "TipRule" r where r."hotelId"=h.id) as regles,
  (select count(*) from "Tip" t where t."hotelId"=h.id) as pourboires,
  (select coalesce(sum(t.amount),0) from "Tip" t where t."hotelId"=h.id and t.status='DISTRIBUTED') as distribues
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
