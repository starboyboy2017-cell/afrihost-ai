-- ============================================================================
-- AfriHost AI — Jeu de démonstration : API Publique & Marketplace (Module 30)
-- Fichier : database/seed/30-demo-publicapi.sql
--
--   * une application tierce (sandbox) ;
--   * une credential API Key (hash démo) ;
--   * un webhook ;
--   * une app marketplace de connecteur.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  app_id text;
  cred_id text;
begin
  -- Application tierce (sandbox)
  insert into "ApiApp"(id, name, description, "ownerOrgId", environment, "updatedAt")
  select gen_random_uuid()::text, 'Partner Booking Widget', 'Widget de réservation tiers', o.id, 'SANDBOX', now()
  from "Organisation" o
  where not exists (select 1 from "ApiApp" where name='Partner Booking Widget') returning id into app_id;

  if app_id is not null then
    -- Credential API Key (secret: 'demo-secret-key-123', hashé)
    insert into "ApiCredential"(id, "appId", kind, "clientId", "secretHash", scopes, hotels, environment, "rateLimitPerMinute")
    values (gen_random_uuid()::text, app_id, 'API_KEY',
      'af_demo_client_0001',
      encode(sha256(convert_to('afrihost-publicapi:demo-secret-key-123', 'UTF8')), 'hex'),
      array['reservations.read','invoices.read'], array[]::text[], 'SANDBOX', 60) returning id into cred_id;

    -- Webhook
    insert into "ApiWebhook"(id, "appId", url, events, "isActive", "updatedAt")
    values (gen_random_uuid()::text, app_id, 'https://partner.example.com/hooks/afrihost', array['reservation.created','payment.received'], true, now());

    -- Marketplace : connecteur
    insert into "ApiMarketplaceApp"(id, "appId", name, category, summary, version, "isPublished", "installs", "updatedAt")
    values (gen_random_uuid()::text, app_id, 'Connecteur GDS', 'connector', 'Synchronisation avec un GDS', '1.0.0', true, 12, now());
  end if;
end $$;

-- Récapitulatif
select (select count(*) from "ApiApp") as applications,
  (select count(*) from "ApiCredential") as credentials,
  (select count(*) from "ApiWebhook") as webhooks,
  (select count(*) from "ApiMarketplaceApp") as marketplace;
