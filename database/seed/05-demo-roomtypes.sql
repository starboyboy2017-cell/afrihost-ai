-- ============================================================================
-- AfriHost AI — Jeu de démonstration : types de chambres & tarifs flexibles
-- Fichier : database/seed/05-demo-roomtypes.sql
--
-- Crée :
--   * une organisation de démo (trigger => 11 rôles auto) ;
--   * 2 HÔTELS (Cotonou, Dakar) pour prouver l'ISOLATION multihôtel ;
--   * pour chaque hôtel : des types de chambres + plans tarifaires
--     (BASE / SEASONAL / WEEKEND / PROMOTIONAL), prix par DEVISE
--     (XOF, NGN, EUR), et restrictions (séjour min, capacité).
--
-- IDEMPOTENT : ré-exécutable sans doublon (slug unique).
-- NB : nécessite pgcrypto (gen_random_uuid) — actif par défaut sur Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Organisation de démo + 2 hôtels
-- ---------------------------------------------------------------------------
do $$
declare
  v_org text;
  h_co text; h_dk text;
begin
  -- Organisation (le trigger crée les 11 rôles automatiquement)
  insert into "Organisation"(id, name, slug, "updatedAt")
  values (gen_random_uuid()::text, 'Organisation Démo', 'demo-org-' || replace(gen_random_uuid()::text,'-',''), now())
  returning id into v_org;

  -- 2 hôtels (isolation)
  insert into "Hotel"(id, "organisationId", name, slug, code, currency, locale, timezone, "vatRate", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'Hôtel Démo Cotonou', 'demo-cotonou-'||replace(gen_random_uuid()::text,'-',''), 'DEMO-CO', 'XOF', 'fr', 'Africa/Porto-Novo', 0.18, true, now())
  returning id into h_co;

  insert into "Hotel"(id, "organisationId", name, slug, code, currency, locale, timezone, "vatRate", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'Hôtel Démo Dakar', 'demo-dakar-'||replace(gen_random_uuid()::text,'-',''), 'DEMO-DK', 'XOF', 'fr', 'Africa/Dakar', 0.18, true, now())
  returning id into h_dk;

  -- Mémoriser les ids pour les requêtes de vérification
  perform set_config('v.org', v_org, false);
  perform set_config('v.h_co', h_co, false);
  perform set_config('v.h_dk', h_dk, false);
end $$;

-- ---------------------------------------------------------------------------
-- 2) Types de chambres + plans tarifaires (via le trigger réutilisable)
--    On insère directement les types/plans pour chaque hôtel.
-- ---------------------------------------------------------------------------
do $$
declare
  h text;
  rt text;
begin
  -- Pour chaque hôtel de l'org de démo
  for h in select "id" from "Hotel" where "slug" like 'demo-%' loop
    -- Type de chambre : Standard (tarif de base)
    insert into "RoomType"(id, "hotelId", name, description, "baseRate", "maxOccupancy", "bedCount", amenities, "isActive", "updatedAt")
    values (gen_random_uuid()::text, h, 'Chambre Standard', 'Chambre simple avec lit double', 5000, 2, 1, array['wifi','clim','tv'], true, now())
    returning id into rt;

    -- Plan BASE (toute l'année) en XOF et EUR
    insert into "RatePlan"(id, "hotelId", "roomTypeId", name, type, "isActive", "updatedAt")
    values (gen_random_uuid()::text, h, rt, 'Tarif standard', 'BASE', true, now());

    insert into "RatePlanPrice"(id, "ratePlanId", currency, amount)
    select gen_random_uuid()::text, id, 'XOF', 5000 from "RatePlan" where "hotelId"=h and name='Tarif standard';
    insert into "RatePlanPrice"(id, "ratePlanId", currency, amount)
    select gen_random_uuid()::text, id, 'EUR', 8 from "RatePlan" where "hotelId"=h and name='Tarif standard';

    -- Type de chambre : Suite (tarif de base élevé)
    insert into "RoomType"(id, "hotelId", name, description, "baseRate", "maxOccupancy", "bedCount", amenities, "isActive", "updatedAt")
    values (gen_random_uuid()::text, h, 'Suite Exécutive', 'Suite avec salon', 15000, 4, 2, array['wifi','clim','tv','bain'], true, now());

    -- Plan SEASONAL "Haute saison" (déc) pour la Suite
    insert into "RatePlan"(id, "hotelId", "roomTypeId", name, type, "startDate", "endDate", "isActive", "updatedAt")
    select gen_random_uuid()::text, h, id, 'Haute saison', 'SEASONAL', '2026-12-01', '2026-12-31', true, now()
    from "RoomType" where "hotelId"=h and name='Suite Exécutive';

    insert into "RatePlanPrice"(id, "ratePlanId", currency, amount)
    select gen_random_uuid()::text, id, 'XOF', 22000 from "RatePlan" where "hotelId"=h and name='Haute saison';
    insert into "RatePlanPrice"(id, "ratePlanId", currency, amount)
    select gen_random_uuid()::text, id, 'NGN', 18000 from "RatePlan" where "hotelId"=h and name='Haute saison';

    -- Restrictions sur la haute saison (séjour min 3 nuits, max 2 invités)
    insert into "RatePlanRestriction"(id, "ratePlanId", "minNights", "maxGuests", "isActive", "updatedAt")
    select gen_random_uuid()::text, id, 3, 2, true, now() from "RatePlan" where "hotelId"=h and name='Haute saison';

    -- Type de chambre : Chambre Familiale
    insert into "RoomType"(id, "hotelId", name, description, "baseRate", "maxOccupancy", "bedCount", amenities, "isActive", "updatedAt")
    values (gen_random_uuid()::text, h, 'Chambre Familiale', 'Idéale pour les familles', 8000, 4, 2, array['wifi','clim','tv','balcon'], true, now());

    -- Plan PROMOTIONAL "Promo été"
    insert into "RatePlan"(id, "hotelId", "roomTypeId", name, type, "startDate", "endDate", "isActive", "updatedAt")
    select gen_random_uuid()::text, h, id, 'Promo été', 'PROMOTIONAL', '2026-07-01', '2026-08-31', true, now()
    from "RoomType" where "hotelId"=h and name='Chambre Familiale';
    insert into "RatePlanPrice"(id, "ratePlanId", currency, amount)
    select gen_random_uuid()::text, id, 'XOF', 6500 from "RatePlan" where "hotelId"=h and name='Promo été';
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Récapitulatif de vérification
-- ---------------------------------------------------------------------------
select o.name as organisation, h.name as hotel,
  (select count(*) from "RoomType" rt where rt."hotelId"=h.id) as types,
  (select count(*) from "RatePlan" rp where rp."hotelId"=h.id) as plans
from "Organisation" o join "Hotel" h on h."organisationId"=o.id
where o.name='Organisation Démo' order by h.name;
