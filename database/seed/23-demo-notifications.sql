-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Notifications multicanales (Module 23)
-- Fichier : database/seed/23-demo-notifications.sql
--
-- Pour l'hôtel Cotonou :
--   * fournisseurs : Email (Resend), SMS (Twilio), WhatsApp (Meta), Push (FCM) ;
--   * templates multilingues (fr) avec variables ;
--   * déclencheurs automatiques (réservation confirmée, check-in, paiement) ;
--   * une campagne programmée ;
--   * un envoi de démonstration livré.
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

  -- Fournisseurs (provider-agnostic : clés configurées, aucune logique en dur)
  insert into "NotificationProvider"(id, "hotelId", name, channel, "providerType", "providerKey", credentials, "fromAddress", "domain", "isDefault", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Resend', 'EMAIL', 'EMAIL', 'resend',
    '{"apiKey":"re_demo_0000"}'::jsonb, 'noreply@demo.bj', 'demo.bj', true, true, now()
  where not exists (select 1 from "NotificationProvider" where "hotelId"=h_co and "providerKey"='resend');

  insert into "NotificationProvider"(id, "hotelId", name, channel, "providerType", "providerKey", credentials, "fromAddress", "isDefault", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Twilio', 'SMS', 'SMS', 'twilio',
    '{"accountSid":"AC_demo","authToken":"demo"}'::jsonb, '+22901010101', true, true, now()
  where not exists (select 1 from "NotificationProvider" where "hotelId"=h_co and "providerKey"='twilio');

  insert into "NotificationProvider"(id, "hotelId", name, channel, "providerType", "providerKey", credentials, "fromAddress", "isDefault", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Meta WhatsApp', 'WHATSAPP', 'WHATSAPP', 'meta',
    '{"phoneNumberId":"demo","token":"demo"}'::jsonb, 'whatsapp:+22901010101', true, true, now()
  where not exists (select 1 from "NotificationProvider" where "hotelId"=h_co and "providerKey"='meta');

  insert into "NotificationProvider"(id, "hotelId", name, channel, "providerType", "providerKey", credentials, "isDefault", "isActive", "updatedAt")
  select gen_random_uuid()::text, h_co, 'Firebase FCM', 'PUSH', 'PUSH', 'fcm',
    '{"serverKey":"demo"}'::jsonb, true, true, now()
  where not exists (select 1 from "NotificationProvider" where "hotelId"=h_co and "providerKey"='fcm');

  -- Templates multilingues avec variables
  insert into "NotificationTemplate"(id, "hotelId", channel, "eventType", code, locale, subject, body, variables, "updatedAt")
  select gen_random_uuid()::text, h_co, 'EMAIL', 'RESERVATION_CONFIRMED', 'booking_confirmation', 'fr',
    'Confirmation {{reservation.code}}', 'Bonjour {{firstName}},\nVotre réservation {{reservation.code}} est confirmée. À bientôt !',
    array['firstName','reservation.code'], now()
  where not exists (select 1 from "NotificationTemplate" where "hotelId"=h_co and code='booking_confirmation' and channel='EMAIL' and locale='fr');

  insert into "NotificationTemplate"(id, "hotelId", channel, "eventType", code, locale, body, variables, "updatedAt")
  select gen_random_uuid()::text, h_co, 'SMS', 'CHECK_IN', 'checkin', 'fr',
    'Bienvenue {{firstName}} ! Votre chambre {{room}} est prête. {{hotelName}}',
    array['firstName','room','hotelName'], now()
  where not exists (select 1 from "NotificationTemplate" where "hotelId"=h_co and code='checkin' and channel='SMS' and locale='fr');

  insert into "NotificationTemplate"(id, "hotelId", channel, "eventType", code, locale, body, variables, "updatedAt")
  select gen_random_uuid()::text, h_co, 'WHATSAPP', 'PAYMENT_RECEIVED', 'payment_received', 'fr',
    'Paiement de {{amount}} {{currency}} reçu. Merci !',
    array['amount','currency'], now()
  where not exists (select 1 from "NotificationTemplate" where "hotelId"=h_co and code='payment_received' and channel='WHATSAPP' and locale='fr');

  -- Déclencheurs automatiques
  insert into "NotificationTrigger"(id, "hotelId", "eventType", channel, "templateCode", condition, priority, "updatedAt")
  select gen_random_uuid()::text, h_co, 'RESERVATION_CONFIRMED', 'EMAIL', 'booking_confirmation', '{"field":"status","op":"eq","value":"CONFIRMED"}'::jsonb, 'NORMAL', now()
  where not exists (select 1 from "NotificationTrigger" where "hotelId"=h_co and "eventType"='RESERVATION_CONFIRMED' and channel='EMAIL');

  insert into "NotificationTrigger"(id, "hotelId", "eventType", channel, "templateCode", priority, "updatedAt")
  select gen_random_uuid()::text, h_co, 'CHECK_IN', 'SMS', 'checkin', 'NORMAL', now()
  where not exists (select 1 from "NotificationTrigger" where "hotelId"=h_co and "eventType"='CHECK_IN' and channel='SMS');

  -- Campagne programmée
  insert into "NotificationCampaign"(id, "hotelId", name, channel, "templateCode", "scheduleAt", status, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Promo été WhatsApp', 'WHATSAPP', 'payment_received', now() + interval '2 days', 'SCHEDULED', now()
  where not exists (select 1 from "NotificationCampaign" where "hotelId"=h_co and name='Promo été WhatsApp');

  -- Envoi de démonstration (historique)
  if g is not null then
    insert into "NotificationSend"(id, "hotelId", channel, "eventType", "templateCode", "recipientType", "recipientId", recipient, subject, body, status, priority, attempts, "maxAttempts", "providerRef", "sentAt", "deliveredAt", "createdAt", "updatedAt")
    select gen_random_uuid()::text, h_co, 'EMAIL', 'RESERVATION_CONFIRMED', 'booking_confirmation', 'guest', g,
      (select email from "Guest" where id=g), 'Confirmation DEMO', 'Bonjour, votre réservation DEMO est confirmée.', 'DELIVERED', 'NORMAL', 1, 3, 'demo-send-1', now(), now(), now(), now()
    where not exists (select 1 from "NotificationSend" where "hotelId"=h_co and "providerRef"='demo-send-1');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "NotificationProvider" p where p."hotelId"=h.id) as fournisseurs,
  (select count(*) from "NotificationTemplate" t where t."hotelId"=h.id) as templates,
  (select count(*) from "NotificationTrigger" t where t."hotelId"=h.id) as declencheurs,
  (select count(*) from "NotificationCampaign" c where c."hotelId"=h.id) as campagnes,
  (select count(*) from "NotificationSend" s where s."hotelId"=h.id) as envois
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
