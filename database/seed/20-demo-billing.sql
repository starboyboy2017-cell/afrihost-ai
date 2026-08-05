-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Paiements & facturation (Module 20)
-- Fichier : database/seed/20-demo-billing.sql
--
-- Crée pour l'hôtel Cotonou :
--   * un folio client avec des lignes (hébergement + restauration) ;
--   * un paiement Mobile Money ;
--   * une passerelle de paiement configurée.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text; guest_id text; fl text; gw text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;
  select "id" into guest_id from "Guest" where "hotelId"=h_co limit 1;

  -- Passerelle
  insert into "PaymentGateway"(id, "hotelId", name, provider, "updatedAt")
  select gen_random_uuid()::text, h_co, 'MTN MoMo', 'mtn_mobile_money', now()
  where not exists (select 1 from "PaymentGateway" where "hotelId"=h_co and provider='mtn_mobile_money') returning id into gw;

  -- Folio client (si guest existe)
  if guest_id is not null then
    insert into "Folio"(id, "hotelId", "guestId", "folioRef", name, status, "updatedAt")
    select gen_random_uuid()::text, h_co, guest_id, 'FL-2026-0001', 'Chambre 102 - Amadou Diallo', 'OPEN', now()
    where not exists (select 1 from "Folio" where "hotelId"=h_co and "folioRef"='FL-2026-0001') returning id into fl;

    if fl is not null then
      -- Lignes de frais (hébergement + restauration)
      insert into "FolioLine"(id, "folioId", "chargeType", description, quantity, "unitPrice", amount, "taxRate", "postedAt")
      values
        (gen_random_uuid()::text, fl, 'ROOM', 'Hébergement - 3 nuits', 3, 5000, 15000, 0.18, now() - interval '1 day'),
        (gen_random_uuid()::text, fl, 'RESTAURANT', 'Dîner au restaurant', 1, 5000, 5000, 0.18, now() - interval '2 hours');

      -- Paiement Mobile Money (acompte)
      insert into "Payment"(id, "hotelId", "folioId", "guestId", amount, currency, method, status, kind, "gatewayId", "receivedAt")
      values (gen_random_uuid()::text, h_co, fl, guest_id, 5000, 'XOF', 'MOBILE_MONEY', 'PAID', 'DEPOSIT', gw, now());
    end if;
  end if;
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "Folio" f where f."hotelId"=h.id) as folios,
  (select count(*) from "FolioLine" l join "Folio" f on f.id=l."folioId" where f."hotelId"=h.id) as lignes,
  (select count(*) from "PaymentGateway" g where g."hotelId"=h.id) as passerelles
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
