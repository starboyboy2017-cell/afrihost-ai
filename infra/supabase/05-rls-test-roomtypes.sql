-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 5 (types de chambres & tarifs)
-- Fichier : infra/supabase/05-rls-test-roomtypes.sql
--
-- Vérifie que, sur le jeu de démonstration (2 hôtels), chaque utilisateur ne voit
-- QUE les types de chambres / plans tarifaires de SON hôtel (isolation multihôtel).
-- NETTOIE les utilisateurs/membreships de test à la fin (relançable).
--
-- Résultat attendu : aucune erreur (le DO se termine sans exception).
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := 'aaaaaaaa-0000-4000-8000-00000000000a';
  uidB text := 'bbbbbbbb-0000-4000-8000-00000000000b';
  r text;
  u_co text; u_dk text;
  n int;
begin
  -- Références de démo
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  select "id" into h_dk from "Hotel" where code='DEMO-DK';
  if v_org is null or h_co is null or h_dk is null then
    raise exception 'Jeu de démo absent. Exécutez d''abord database/seed/05-demo-roomtypes.sql';
  end if;

  -- Réutilise le rôle FRONT_DESK existant (créé par le trigger à la création de l'org)
  select "id" into r from "Role" where "organisationId"=v_org and name='FRONT_DESK';
  if r is null then
    insert into "Role"(id, "organisationId", name, description, "isSystem")
    values (gen_random_uuid()::text, v_org, 'FRONT_DESK', 'test rls', false)
    returning id into r;
  end if;

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'rls-a@demo.local', 'A', 'RLS', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'rls-b@demo.local', 'B', 'RLS', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- ---- TEST A (Cotonou) : voit 3 types de son hôtel, 0 de Dakar ----
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "RoomType" rt join "Hotel" h on h.id=rt."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 3 then raise exception 'ECHEC: A voit % types de Cotonou (attendu 3)', n; end if;
  execute 'select count(*) from "RoomType" rt join "Hotel" h on h.id=rt."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % types de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- ---- TEST B (Dakar) : voit 3 types de son hôtel, 0 de Cotonou ----
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "RoomType" rt join "Hotel" h on h.id=rt."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 3 then raise exception 'ECHEC: B voit % types de Dakar (attendu 3)', n; end if;
  execute 'select count(*) from "RoomType" rt join "Hotel" h on h.id=rt."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % types de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- ---- NETTOYAGE ----
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  -- On ne supprime le rôle que s'il a été créé par ce script (isSystem=false)
  delete from "Role" where id = r and "isSystem" = false;
  -- reset du claim
  perform set_config('request.jwt.claims', '{}', true);
end $$;
