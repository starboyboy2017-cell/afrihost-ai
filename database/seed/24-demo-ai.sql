-- ============================================================================
-- AfriHost AI — Jeu de démonstration : IA (Module 24)
-- Fichier : database/seed/24-demo-ai.sql
--
-- Pour l'hôtel Cotonou :
--   * un fournisseur LLM (Ollama local, provider-agnostic) — désactivé par défaut
--     pour démontrer que l'app fonctionne sans IA ;
--   * configuration des fonctionnalités (assistant, suggestions, prédictions,
--     alertes, recommandations) avec quotas ;
--   * une prédiction d'occupation déterministe, une suggestion et une alerte.
--
-- IDEMPOTENT. NB : pgcrypto requis. Exécuter après seed 05.
-- ============================================================================

do $$
declare
  h_co text;
  g text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into g from "Guest" where "hotelId"=h_co limit 1;

  -- Fournisseur LLM (Ollama, self-hosted) — isActive=false par défaut
  insert into "AiProvider"(id, "hotelId", name, "providerKey", "baseUrl", model, credentials, "isDefault", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Ollama (local)', 'ollama', 'http://localhost:11434', 'llama3',
    '{}'::jsonb, true, false, now()
  where not exists (select 1 from "AiProvider" where "hotelId"=h_co and "providerKey"='ollama');

  -- Configuration des fonctionnalités (désactivées par défaut => app sans IA)
  insert into "AiFeature"(id, "hotelId", feature, "isEnabled", "quotaPerDay", "updatedAt")
  select gen_random_uuid()::text, h_co, f, false, 100, now()
  from unnest(array['assistant','search','suggestions','predictions','alerts','recommendations','prioritization','reports','rag']) f
  where not exists (select 1 from "AiFeature" where "hotelId"=h_co and feature=f);

  -- Prédiction d'occupation déterministe (règle : moyenne mobile + tendance)
  insert into "AiPrediction"(id, "hotelId", metric, horizon, value, confidence, model, "periodStart", "periodEnd", context)
  select gen_random_uuid()::text, h_co, 'occupancy', 'week', 78, 0.9, 'rule', now(), now() + interval '7 days',
    '{"points":14,"trendPercent":8.2}'::jsonb
  where not exists (select 1 from "AiPrediction" where "hotelId"=h_co and metric='occupancy' and horizon='week');

  -- Suggestion déterministe (démo)
  if g is not null then
    insert into "AiSuggestion"(id, "hotelId", "guestId", kind, title, detail, context, source, status)
    select gen_random_uuid()::text, h_co, g, 'upsell', 'Proposer un forfait SPA', 'Client en séjour prolongé', '{"nights":4}'::jsonb, 'RULE', 'NEW'
    where not exists (select 1 from "AiSuggestion" where "hotelId"=h_co and kind='upsell' and "guestId"=g);
  end if;

  -- Alerte (démo)
  insert into "AiAlert"(id, "hotelId", severity, type, title, detail, source, status)
  select gen_random_uuid()::text, h_co, 'WARNING', 'late_payment', 'Paiements en retard', '2 folios présentent des paiements en retard.', 'RULE', 'OPEN'
  where not exists (select 1 from "AiAlert" where "hotelId"=h_co and type='late_payment');
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "AiProvider" p where p."hotelId"=h.id) as fournisseurs_llm,
  (select count(*) from "AiFeature" f where f."hotelId"=h.id) as fonctionnalites,
  (select count(*) from "AiPrediction" p where p."hotelId"=h.id) as predictions,
  (select count(*) from "AiSuggestion" s where s."hotelId"=h.id) as suggestions,
  (select count(*) from "AiAlert" a where a."hotelId"=h.id) as alertes
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
