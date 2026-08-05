-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Reporting & BI (Module 28)
-- Fichier : database/seed/28-demo-bi.sql
--
-- Pour l'hôtel Cotonou :
--   * un tableau de bord Direction ;
--   * un rapport financier (RevPAR) ;
--   * une planification email hebdomadaire.
--
-- IDEMPOTENT. NB : pgcrypto requis. Exécuter après seed 05.
-- ============================================================================

do $$
declare
  h_co text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  insert into "BiDashboard"(id, "hotelId", name, role, scope, layout, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Dashboard Direction', 'DIRECTION', 'HOTEL',
    '{"widgets":["occupancy","revpar","revenue"]}'::jsonb, now()
  where not exists (select 1 from "BiDashboard" where "hotelId"=h_co and name='Dashboard Direction');

  insert into "BiDashboard"(id, "hotelId", name, role, scope, layout, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Dashboard Réception', 'RECEPTION', 'HOTEL',
    '{"widgets":["checkins","occupancy"]}'::jsonb, now()
  where not exists (select 1 from "BiDashboard" where "hotelId"=h_co and name='Dashboard Réception');

  insert into "BiReport"(id, "hotelId", name, category, type, filters, "groupBy", "updatedAt")
  select gen_random_uuid()::text, h_co, 'RevPAR mensuel', 'FINANCIAL', 'kpi',
    '{"period":"month"}'::jsonb, 'month', now()
  where not exists (select 1 from "BiReport" where "hotelId"=h_co and name='RevPAR mensuel');

  insert into "BiSchedule"(id, "hotelId", "reportId", email, frequency, format, "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, (select id from "BiReport" where "hotelId"=h_co and name='RevPAR mensuel' limit 1),
    'direction@demo.bj', 'WEEKLY', 'PDF', true, now()
  where not exists (select 1 from "BiSchedule" where "hotelId"=h_co and email='direction@demo.bj');
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "BiDashboard" d where d."hotelId"=h.id) as tableaux,
  (select count(*) from "BiReport" r where r."hotelId"=h.id) as rapports,
  (select count(*) from "BiSchedule" s where s."hotelId"=h.id) as planifications
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
