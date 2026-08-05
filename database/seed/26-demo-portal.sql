-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Portail Client (Module 26)
-- Fichier : database/seed/26-demo-portal.sql
--
-- Pour l'hôtel Cotonou :
--   * un compte portail (mot de passe hashé démo) ;
--   * un appareil connecté ;
--   * un message client → hôtel ;
--   * une demande de service (transport) ;
--   * une notification / offre personnalisée.
--
-- IDEMPOTENT. NB : pgcrypto requis. Exécuter après seed 05.
-- ============================================================================

do $$
declare
  h_co text;
  g text;
  pu text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into g from "Guest" where "hotelId"=h_co limit 1;

  if g is not null then
    -- Compte portail (hash sha256 démo de "demo1234")
    -- Hash sha256 statique de "afrihost:demo1234" (compatible avec le service).
    insert into "PortalUser"(id, "hotelId", "guestId", email, phone, "passwordHash", "emailVerified", "phoneVerified", "isActive", "lastLoginAt", "updatedAt")
    select gen_random_uuid()::text, h_co, g,
      (select email from "Guest" where id=g), (select phone from "Guest" where id=g),
      '45a0b5483fdc4d8926de407fedd197b3eed754667e0deba0bc420cb421c2049e', true, false, true, now(), now()
    where not exists (select 1 from "PortalUser" where "hotelId"=h_co and "guestId"=g) returning id into pu;

    if pu is not null then
      -- Appareil connecté
      insert into "PortalDevice"(id, "portalUserId", "hotelId", "deviceName", platform)
      values (gen_random_uuid()::text, pu, h_co, 'iPhone 15', 'ios');

      -- Message client → hôtel
      insert into "PortalMessage"(id, "hotelId", "portalUserId", "guestId", direction, subject, body)
      values (gen_random_uuid()::text, h_co, pu, g, 'CLIENT_TO_HOTEL', 'Heure d''arrivée', 'Bonjour, j''arriverai vers 20h. Merci.');

      -- Demande de service (transport)
      insert into "PortalServiceRequest"(id, "hotelId", "portalUserId", "guestId", kind, title, detail, "updatedAt")
      values (gen_random_uuid()::text, h_co, pu, g, 'transport', 'Navette aéroport', 'Transfert depuis Cotonou aéroport le 12/08', now());

      -- Notification / offre
      insert into "PortalNotification"(id, "hotelId", "portalUserId", "guestId", kind, title, body)
      values (gen_random_uuid()::text, h_co, pu, g, 'offer', 'Offre SPA', 'Profitez de -20% sur les soins spa ce week-end.');
    end if;
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "PortalUser" u where u."hotelId"=h.id) as comptes,
  (select count(*) from "PortalDevice" d where d."hotelId"=h.id) as appareils,
  (select count(*) from "PortalMessage" m where m."hotelId"=h.id) as messages,
  (select count(*) from "PortalServiceRequest" r where r."hotelId"=h.id) as demandes,
  (select count(*) from "PortalNotification" n where n."hotelId"=h.id) as notifications
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
