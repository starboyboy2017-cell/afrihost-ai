-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Channel Manager / OTA (Module 25)
-- Fichier : database/seed/25-demo-channel.sql
--
-- Pour l'hôtel Cotonou :
--   * des comptes OTA (Booking, Expedia, Airbnb) avec credentials configurables ;
--   * des mappings chambre PMS ↔ chambre OTA ;
--   * un job de synchronisation réussi (disponibilité) + un log.
--
-- IDEMPOTENT. NB : pgcrypto requis. Exécuter après seed 05.
-- ============================================================================

do $$
declare
  h_co text;
  rt_id text;
  acc_booking text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into rt_id from "RoomType" where "hotelId"=h_co limit 1;

  -- Comptes OTA
  insert into "ChannelAccount"(id, "hotelId", "otaKey", name, credentials, config, "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'booking-demo', 'Booking.com', '{"apiKey":"bk_demo_0000","username":"demo"}'::jsonb, '{"currency":"XOF","policies":{"minStay":1}}'::jsonb, true, now()
  where not exists (select 1 from "ChannelAccount" where "hotelId"=h_co and "otaKey"='booking-demo') returning id into acc_booking;

  insert into "ChannelAccount"(id, "hotelId", "otaKey", name, credentials, "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'expedia-demo', 'Expedia', '{"apiKey":"ex_demo_0000"}'::jsonb, true, now()
  where not exists (select 1 from "ChannelAccount" where "hotelId"=h_co and "otaKey"='expedia-demo');

  insert into "ChannelAccount"(id, "hotelId", "otaKey", name, credentials, "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'airbnb-demo', 'Airbnb', '{"token":"ab_demo_0000"}'::jsonb, true, now()
  where not exists (select 1 from "ChannelAccount" where "hotelId"=h_co and "otaKey"='airbnb-demo');

  -- Mapping chambre PMS ↔ OTA (Booking)
  if rt_id is not null and acc_booking is not null then
    insert into "ChannelRoomMapping"(id, "accountId", "hotelId", "roomTypeId", "otaRoomId", "otaRoomName", "updatedAt")
    select gen_random_uuid()::text, acc_booking, h_co, rt_id, 'bk_room_101', 'Standard Room', now()
    where not exists (select 1 from "ChannelRoomMapping" where "accountId"=acc_booking and "roomTypeId"=rt_id);

    -- Job de synchronisation réussi (disponibilité)
    insert into "ChannelSyncJob"(id, "accountId", "hotelId", direction, type, status, attempts, "maxAttempts", payload, result, "createdAt", "updatedAt")
    select gen_random_uuid()::text, acc_booking, h_co, 'outbound', 'availability', 'SUCCESS', 1, 3,
      '{"updates":[{"date":"2026-08-10","rooms":8}]}'::jsonb, '{"pushed":1}'::jsonb, now(), now()
    where not exists (select 1 from "ChannelSyncJob" where "accountId"=acc_booking and type='availability');

    -- Log
    insert into "ChannelSyncLog"(id, "accountId", "hotelId", level, message)
    select gen_random_uuid()::text, acc_booking, h_co, 'INFO', 'Synchronisation availability réussie'
    where not exists (select 1 from "ChannelSyncLog" where "accountId"=acc_booking and message='Synchronisation availability réussie');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "ChannelAccount" a where a."hotelId"=h.id) as comptes_ota,
  (select count(*) from "ChannelRoomMapping" m where m."hotelId"=h.id) as mappings,
  (select count(*) from "ChannelSyncJob" j where j."hotelId"=h.id) as jobs,
  (select count(*) from "ChannelSyncLog" l where l."hotelId"=h.id) as logs
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
