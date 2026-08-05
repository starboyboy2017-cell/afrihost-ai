-- ============================================================================
-- AfriHost AI — TEST de validation du Row Level Security (multi-tenant + RBAC)
-- Fichier : infra/supabase/04-rls-test.sql
--
-- Ce script VÉRIFIE l'isolation entre hôtels :
--   1. crée 2 hôtels (H1, H2) dans une organisation de test ;
--   2. crée 2 utilisateurs A (membre de H1 en FRONT_DESK) et B (membre de H2 en
--      FRONT_DESK), plus C (aucun rôle) ;
--   3. crée 1 réservation dans chaque hôtel ;
--   4. SIMULE la session de chaque utilisateur (auth.uid() + rôle authenticated) et
--      vérifie qu'il ne VOIT et ne MODIFIE que les données de son hôtel ;
--   5. NETTOIE toutes les données de test (en succès comme en échec) => relançable
--      autant de fois que nécessaire.
--
-- EXÉCUTION : à lancer dans le SQL Editor Supabase (connecté en postgres).
-- Résultat attendu : NOTICE 'RLS OK ...' + aucune erreur. En cas de non-respect de
-- l'isolation, le script lève une EXCEPTION explicite (et nettoie quand même).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Fonction de nettoyage (indépendante, SECURITY DEFINER) — relançable
-- ---------------------------------------------------------------------------
create or replace function afrihost_cleanup_rls_test(p_org text)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Ordre inverse des FK (enfants avant parents)
  delete from "Reservation" where "hotelId" in (select "id" from "Hotel" where "organisationId" = p_org);
  delete from "Guest"       where "organisationId" = p_org;
  delete from "Membership"  where "hotelId" in (select "id" from "Hotel" where "organisationId" = p_org);
  delete from "User"        where "organisationId" = p_org;
  delete from "Role"        where "organisationId" = p_org;
  delete from "Hotel"       where "organisationId" = p_org;
  delete from "Organisation" where "id" = p_org;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Boucle principale du test
-- ---------------------------------------------------------------------------
do $$
declare
  orgid text := 'torg-' || gen_random_uuid()::text;
  h1 text; h2 text;
  -- auth.uid() caste le claim JWT 'sub' en UUID : on utilise des UUID valides
  uidA text := 'aaaaaaaa-0000-4000-8000-00000000000a';
  uidB text := 'bbbbbbbb-0000-4000-8000-00000000000b';
  uidC text := 'cccccccc-0000-4000-8000-00000000000c';
  cnt int;
  upd int;
begin
  -- ====================== SETUP (données de test) ======================
  insert into "Organisation"(id, name, slug, "updatedAt")
  values (orgid, 'Org Test RLS', 'test-'||orgid, now()) returning id into orgid;

  insert into "Hotel"(id, "organisationId", name, slug, code, currency, locale, timezone, "vatRate", "isActive", "updatedAt")
  values ( 't1-'||orgid, orgid, 'Hôtel Test 1', 'test1-'||orgid, 'TST1', 'XOF', 'fr', 'Africa/Dakar', 0.18, true, now()),
         ( 't2-'||orgid, orgid, 'Hôtel Test 2', 'test2-'||orgid, 'TST2', 'XOF', 'fr', 'Africa/Dakar', 0.18, true, now());
  h1 := 't1-'||orgid; h2 := 't2-'||orgid;

  -- Utilisateurs (authId = valeur simulée de auth.uid())
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values ( 'uA-'||orgid, orgid, 'a@test.local', 'User', 'A', uidA, true, now()),
         ( 'uB-'||orgid, orgid, 'b@test.local', 'User', 'B', uidB, true, now()),
         ( 'uC-'||orgid, orgid, 'c@test.local', 'User', 'C', uidC, true, now());

  -- Rôle unique FRONT_DESK (le rôle est propre à l'organisation : contrainte
  -- Role_organisationId_name_key => un seul rôle de ce nom par org)
  insert into "Role"(id, "organisationId", name, description, "isSystem") values
    ( 'r1-'||orgid, orgid, 'FRONT_DESK', 'test', false);

  -- Affectations : A -> H1, B -> H2 (aucune pour C) — même rôle, hôtels différents
  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values ( 'm1-'||orgid, 'uA-'||orgid, h1, 'r1-'||orgid, true, now()),
         ( 'm2-'||orgid, 'uB-'||orgid, h2, 'r1-'||orgid, true, now());

  -- 1 réservation dans chaque hôtel
  insert into "Reservation"(id, "hotelId", "bookingRef", source, status, "arrivalDate", "departureDate", "adults", "children", amount, "taxAmount", "discountAmount", currency, "createdAt", "updatedAt")
  values ( 'rv1-'||orgid, h1, 'rv-1-'||orgid, 'DIRECT', 'CONFIRMED', now() + interval '1 day', now() + interval '3 day', 2, 0, 10000, 1800, 0, 'XOF', now(), now()),
         ( 'rv2-'||orgid, h2, 'rv-2-'||orgid, 'DIRECT', 'CONFIRMED', now() + interval '1 day', now() + interval '3 day', 2, 0, 12000, 2160, 0, 'XOF', now(), now());

  -- ====================== TESTS ======================

  -- --- TESTS SUR LES HELPERS (logique exacte des policies) — sans SET ROLE ---
  -- Simule la JWT pour A : ne doit être membre QUE de H1
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  if not auth_has_hotel(h1) then raise exception 'ECHEC: A n''est pas reconnu membre de H1'; end if;
  if auth_has_hotel(h2) then raise exception 'ECHEC: A est reconnu membre de H2 (interdit)'; end if;

  -- Simule la JWT pour B : ne doit être membre QUE de H2
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  if auth_has_hotel(h2) = false then raise exception 'ECHEC: B n''est pas reconnu membre de H2'; end if;
  if auth_has_hotel(h1) then raise exception 'ECHEC: B est reconnu membre de H1 (interdit)'; end if;

  -- Simule la JWT pour C (aucun rôle) : aucun accès hôtel
  perform set_config('request.jwt.claim.sub', uidC, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidC)::text, true);
  if auth_has_hotel(h1) or auth_has_hotel(h2) then raise exception 'ECHEC: C (sans rôle) a accès à un hôtel'; end if;

  -- ====================== TESTS END-TO-END (simulation de session) ======================

  -- --- TEST A : l'utilisateur A ne voit QUE l'hôtel H1 (et sa réservation) ---
  execute 'set role authenticated';
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);

  execute 'select count(*) from "Hotel"' into cnt;
  if cnt <> 1 then raise exception 'ECHEC: A voit % hôtels (attendu 1) -> isolation hôtel non respectée', cnt; end if;

  execute 'select count(*) from "Reservation"' into cnt;
  if cnt <> 1 then raise exception 'ECHEC: A voit % réservations (attendu 1)', cnt; end if;

  -- A ne peut pas modifier H2 (hôtel d'un autre)
  execute 'update "Hotel" set name = name where id = $1' using h2;
  get diagnostics upd = row_count;
  if upd <> 0 then raise exception 'ECHEC: A a modifié H2 (% lignes) -> écriture inter-hôtel non bloquée', upd; end if;

  execute 'set role postgres';

  -- --- TEST B : l'utilisateur B ne voit QUE l'hôtel H2 ---
  execute 'set role authenticated';
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);

  execute 'select count(*) from "Hotel"' into cnt;
  if cnt <> 1 then raise exception 'ECHEC: B voit % hôtels (attendu 1)', cnt; end if;

  execute 'set role postgres';

  -- --- TEST C : un utilisateur sans rôle ne voit AUCUN hôtel ---
  execute 'set role authenticated';
  perform set_config('request.jwt.claim.sub', uidC, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidC)::text, true);

  execute 'select count(*) from "Hotel"' into cnt;
  if cnt <> 0 then raise exception 'ECHEC: C (sans rôle) voit % hôtels (attendu 0)', cnt; end if;

  execute 'set role postgres';

  -- ====================== SUCCÈS + NETTOYAGE ======================
  perform afrihost_cleanup_rls_test(orgid);
  raise notice '✅ RLS OK : isolation entre hôtels vérifiée (A/B/C). Données de test nettoyées.';

exception when others then
  begin
    execute 'set role postgres';
    perform afrihost_cleanup_rls_test(orgid);
  exception when others then
    raise notice '⚠️ Nettoyage échoué mais erreur initiale propagée.';
  end;
  raise;
end $$;
