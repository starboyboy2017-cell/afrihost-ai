-- ============================================================================
-- AfriHost AI — Jeu de démonstration : CRM (Module 21)
-- Fichier : database/seed/21-demo-crm.sql
--
-- Crée pour l'hôtel Cotonou :
--   * une entreprise / agence partenaire ;
--   * un segment dynamique ;
--   * des préférences client ;
--   * une campagne WhatsApp ;
--   * une interaction.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text; guest_id text; co text; seg text; camp text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into guest_id from "Guest" where "hotelId"=h_co limit 1;

  -- Entreprise / agence
  insert into "Company"(id, "hotelId", name, type, email, phone, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Agence Voyage Dakar', 'AGENCY', 'contact@agd.sn', '+2210101', now()
  where not exists (select 1 from "Company" where "hotelId"=h_co and name='Agence Voyage Dakar') returning id into co;

  -- Segment dynamique
  insert into "CustomerSegment"(id, "hotelId", name, description, criteria, "updatedAt")
  select gen_random_uuid()::text, h_co, 'Fidèles VIP', 'Clients à forte valeur', '{"minSpend":100000,"isVip":true}'::jsonb, now()
  where not exists (select 1 from "CustomerSegment" where "hotelId"=h_co and name='Fidèles VIP') returning id into seg;

  -- Préférences client
  if guest_id is not null then
    insert into "GuestPreference"(id, "hotelId", "guestId", language, "bedType", allergies, "favoritePaymentMethod", "updatedAt")
    select gen_random_uuid()::text, h_co, guest_id, 'fr', 'king', array['arachides'], 'MOBILE_MONEY', now()
    where not exists (select 1 from "GuestPreference" where "hotelId"=h_co and "guestId"=guest_id);

    -- Interaction
    insert into "CustomerInteraction"(id, "hotelId", "guestId", type, summary, "sourceModule")
    values (gen_random_uuid()::text, h_co, guest_id, 'preference', 'Préférence de chambre enregistrée', 'crm');
  end if;

  -- Campagne WhatsApp
  insert into "Campaign"(id, "hotelId", "segmentId", name, channel, "messageTemplate", status, "updatedAt")
  select gen_random_uuid()::text, h_co, seg, 'Promo été WhatsApp', 'WHATSAPP', 'Bonjour {{firstName}}, profitez de -15% !', 'DRAFT', now()
  where not exists (select 1 from "Campaign" where "hotelId"=h_co and name='Promo été WhatsApp') returning id into camp;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "Company" c where c."hotelId"=h.id) as entreprises,
  (select count(*) from "CustomerSegment" s where s."hotelId"=h.id) as segments,
  (select count(*) from "Campaign" c where c."hotelId"=h.id) as campagnes,
  (select count(*) from "GuestPreference" p where p."hotelId"=h.id) as preferences
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
