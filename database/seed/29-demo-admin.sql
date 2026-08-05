-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Administration & Paramétrage (Module 29)
-- Fichier : database/seed/29-demo-admin.sql
--
-- Pour l'hôtel Cotonou + SaaS global :
--   * taxes (TVA 18%), devise, langue, fuseau (hôtel) ;
--   * politiques de réservation (annulation) ;
--   * paramètres de facturation (préfixe) ;
--   * fournisseurs email/SMS (hôtel) ;
--   * paramètres de sécurité (hôtel).
--
-- IDEMPOTENT. NB : pgcrypto requis. Exécuter après seed 05.
-- ============================================================================

do $$
declare
  h_co text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- SaaS global : nombre max d'hôtels par organisation
  insert into "AdminConfig"(id, scope, category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'SAAS', 'saas', 'maxHotelsPerOrg', '{"value":20}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='SAAS' and category='saas' and key='maxHotelsPerOrg');

  -- Hôtel : taxe, devise, langue, fuseau
  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'tax', 'vatRate', '{"rate":0.18}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='tax' and key='vatRate');

  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'currency', 'base', '{"code":"XOF"}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='currency' and key='base');

  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'language', 'default', '{"locale":"fr"}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='language' and key='default');

  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'timezone', 'iana', '{"id":"Africa/Porto-Novo"}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='timezone' and key='iana');

  -- Politique de réservation : annulation gratuite jusqu'à 48h
  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'booking_policy', 'cancellation', '{"freeUntilHours":48}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='booking_policy' and key='cancellation');

  -- Facturation : préfixe
  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'billing', 'invoicePrefix', '{"prefix":"INV-DEMO-"}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='billing' and key='invoicePrefix');

  -- Fournisseur email
  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'email_provider', 'default', '{"provider":"resend","from":"noreply@demo.bj"}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='email_provider' and key='default');

  -- Sécurité : durée de session
  insert into "AdminConfig"(id, scope, "hotelId", category, key, value, "isActive", "updatedAt")
  select gen_random_uuid()::text, 'HOTEL', h_co, 'security', 'sessionTtlHours', '{"hours":8}'::jsonb, true, now()
  where not exists (select 1 from "AdminConfig" where scope='HOTEL' and "hotelId"=h_co and category='security' and key='sessionTtlHours');
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "AdminConfig" c where c.scope='HOTEL' and c."hotelId"=h.id) as configs_hotel
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
