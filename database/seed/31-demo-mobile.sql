-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Plateforme Mobile (Module 31)
-- Fichier : database/seed/31-demo-mobile.sql
--
-- Pour l'hôtel Cotonou :
--   * un appareil PWA enregistré ;
--   * un token push (web) ;
--   * un journal de synchronisation.
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

  -- Appareil PWA
  insert into "MobileDevice"(id, "hotelId", "guestId", "deviceName", platform, "installId", "lastActiveAt", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, g, 'Smartphone Awa', 'pwa', 'pwa-install-0001', now(), true, now()
  where not exists (select 1 from "MobileDevice" where "installId"='pwa-install-0001');

  -- Token push (web)
  insert into "PushToken"(id, "hotelId", "guestId", platform, token, "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, g, 'web', 'webpush-demo-0001', true, now()
  where not exists (select 1 from "PushToken" where token='webpush-demo-0001');

  -- Journal de synchronisation (déjà synchronisé)
  insert into "MobileSyncLog"(id, "hotelId", "entityType", "entityId", operation, status, "syncedAt")
  select gen_random_uuid()::text, h_co, 'Reservation', 'demo-res-1', 'CREATE', 'SYNCED', now()
  where not exists (select 1 from "MobileSyncLog" where "entityId"='demo-res-1');
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "MobileDevice" d where d."hotelId"=h.id) as appareils,
  (select count(*) from "PushToken" t where t."hotelId"=h.id) as tokens_push,
  (select count(*) from "MobileSyncLog" s where s."hotelId"=h.id) as syncs
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
