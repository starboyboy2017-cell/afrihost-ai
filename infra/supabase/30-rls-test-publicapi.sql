-- ============================================================================
-- AfriHost AI — Test de fonctionnement RLS pour le Module 30 (API Publique)
-- Fichier : infra/supabase/30-rls-test-publicapi.sql
--
-- Les entités API Publique sont globales (cross-hôtel) : l'isolation multi-hôtel
-- est garantie au niveau service (ownerOrgId + scopes de credentials). Ce test
-- vérifie que le RLS est bien ACTIVÉ et que les données de démo sont présentes.
-- ============================================================================

do $$
declare
  rls_active int;
  n_apps int;
begin
  -- RLS actif sur les 6 tables
  select count(*) into rls_active from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname in
      ('ApiApp','ApiCredential','ApiWebhook','ApiWebhookDelivery','ApiMarketplaceApp','ApiAccessLog')
      and c.relrowsecurity = true;
  if rls_active <> 6 then raise exception 'ECHEC: RLS actif sur %/6 tables API', rls_active; end if;

  -- Données de démo présentes
  select count(*) into n_apps from "ApiApp";
  if n_apps < 1 then raise exception 'ECHEC: aucune application tierce'; end if;
end $$;
