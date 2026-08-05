-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Super Administration (Module 33)
-- Fichier : database/seed/33-demo-saasadmin.sql
--
--   * une licence ; un ticket de support ; un check de monitoring ;
--     une sauvegarde ; des métriques SaaS.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';

  -- Licence
  insert into "SaasLicense"(id, "organisationId", "licenseKey", status, "activatedAt", "expiresAt", "quotaAi", "quotaEmail", "quotaSms", "quotaWhatsapp", "quotaApi", "updatedAt")
  select gen_random_uuid()::text, o.id, 'AFR-DEMO-0001', 'ACTIVE', now(), now() + interval '365 days', 10000, 10000, 5000, 5000, 10000, now()
  from "Organisation" o
  where not exists (select 1 from "SaasLicense" where "licenseKey"='AFR-DEMO-0001');

  -- Ticket de support
  insert into "SaasSupportTicket"(id, "organisationId", "hotelId", subject, description, status, priority, "updatedAt")
  select gen_random_uuid()::text, o.id, h_co, 'Problème de connexion API', 'Erreur 401 sur /v1/reservations', 'OPEN', 'HIGH', now()
  from "Organisation" o
  where not exists (select 1 from "SaasSupportTicket" where subject='Problème de connexion API');

  -- Check de monitoring
  insert into "SaasMonitorCheck"(id, target, name, status, "latencyMs", detail, "checkedAt")
  select gen_random_uuid()::text, 'supabase', 'Base de données', 'UP', 42, 'ok', now()
  where not exists (select 1 from "SaasMonitorCheck" where name='Base de données');

  -- Sauvegarde
  insert into "SaasBackup"(id, name, type, status, "sizeBytes", "completedAt")
  select gen_random_uuid()::text, 'backup-demo-001', 'AUTO', 'SUCCESS', 1048576, now()
  where not exists (select 1 from "SaasBackup" where name='backup-demo-001');

  -- Métriques SaaS
  insert into "SaasMetrics"(id, period, "periodStart", "periodEnd", "totalHotels", "activeHotels", "suspendedHotels", "totalUsers", "totalRooms", "totalBookings", revenue, mrr, arr, "retentionRate", "churnRate", growth, "aiUsage", "emailUsage", "smsUsage", "whatsappUsage", "apiUsage", "storageUsed")
  select gen_random_uuid()::text, 'month', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month' - interval '1 day', 2, 1, 1, 10, 14, 5, 120000, 10000, 120000, 0.95, 0.05, 0.15, 250, 800, 300, 200, 500, 2048
  where not exists (select 1 from "SaasMetrics" where period='month');
end $$;

-- Récapitulatif
select (select count(*) from "SaasLicense") as licences,
  (select count(*) from "SaasSupportTicket") as tickets,
  (select count(*) from "SaasMonitorCheck") as checks,
  (select count(*) from "SaasBackup") as backups,
  (select count(*) from "SaasMetrics") as metriques;
