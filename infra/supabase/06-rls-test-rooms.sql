-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 6 (chambres)
-- Fichier : infra/supabase/06-rls-test-rooms.sql
--
-- Vérifie que, sur le jeu de démonstration (2 hôtels), chaque utilisateur ne voit
-- QUE les chambres de SON hôtel (isolation multihôtel), via SET ROLE authenticated.
-- NETTOIE les données de test à la fin (relançable).
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := 'dddddddd-0000-4000-8000-00000000000a';
  uidB text := 'eeeeeeee-0000-4000-8000-00000000000b';
  r text;
  u_co text; u_dk text;
  n int;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  select "id" into h_dk from "Hotel" where code='DEMO-DK';
  if v_org is null or h_co is null or h_dk is null then
    raise exception 'Jeu de démo absent. Exécutez les seeds 05 et 06.';
  end if;

  -- Rôle FRONT_DESK (existant via trigger)
  select "id" into r from "Role" where "organisationId"=v_org and name='FRONT_DESK';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'rooms-a@demo.local', 'A', 'Rooms', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'rooms-b@demo.local', 'B', 'Rooms', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- ---- TEST A (Cotonou) : voit ses chambres, 0 de Dakar ----
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "Room" rm join "Hotel" h on h.id=rm."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 3 then raise exception 'ECHEC: A voit % chambres de Cotonou (attendu >= 3)', n; end if;
  execute 'select count(*) from "Room" rm join "Hotel" h on h.id=rm."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % chambres de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- ---- TEST B (Dakar) : voit ses chambres, 0 de Cotonou ----
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "Room" rm join "Hotel" h on h.id=rm."hotelId" where h.code=''DEMO-DK''' into n;
  if n < 3 then raise exception 'ECHEC: B voit % chambres de Dakar (attendu >= 3)', n; end if;
  execute 'select count(*) from "Room" rm join "Hotel" h on h.id=rm."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % chambres de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- ---- NETTOYAGE ----
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
