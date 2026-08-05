-- ============================================================================
-- AfriHost AI — Jeu de démonstration : DevOps & Sécurité (Module 34)
-- Fichier : database/seed/34-demo-devops.sql
--
--   * health checks (app, supabase, api, ota, ai, payments, email) ;
--   * un incident résolu ; une rotation de secret ; une vérification d'intégrité.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
begin
  -- Health checks (9 composants)
  insert into "HealthCheck"(id, component, status, "latencyMs", "checkedAt")
  select gen_random_uuid()::text, c.component, 'UP', 40, now()
  from (select unnest(array['app','supabase','api','ota','ai','payments','email','whatsapp','sms']) as component) c
  where not exists (select 1 from "HealthCheck" h where h.component=c.component);

  -- Incident de sécurité (résolu)
  insert into "SecurityIncident"(id, type, severity, detail, status, ip, "resolvedAt")
  select gen_random_uuid()::text, 'brute_force', 'HIGH', 'Tentatives répétées bloquées', 'RESOLVED', '203.0.113.10', now()
  where not exists (select 1 from "SecurityIncident" where type='brute_force');

  -- Rotation de secret
  insert into "SecretRotation"(id, "secretKey", provider, reason, "triggeredBy")
  select gen_random_uuid()::text, 'STRIPE_KEY', 'stripe', 'rotation trimestrielle', 'super-admin'
  where not exists (select 1 from "SecretRotation" where "secretKey"='STRIPE_KEY');

  -- Vérification d'intégrité
  insert into "IntegrityCheck"(id, target, status, checksum, "checkedAt")
  select gen_random_uuid()::text, 'db', 'PASSED', 'sha256:abcd1234', now()
  where not exists (select 1 from "IntegrityCheck" where target='db');
end $$;

-- Récapitulatif
select (select count(*) from "HealthCheck") as health_checks,
  (select count(*) from "SecurityIncident") as incidents,
  (select count(*) from "SecretRotation") as rotations,
  (select count(*) from "IntegrityCheck") as integrity;
