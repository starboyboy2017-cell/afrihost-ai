-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 8 (tableau de disponibilité)
-- Fichier : infra/supabase/08-rls-test-availability.sql
--
-- Vérifie qu'un utilisateur ne voit QUE les chambres de SON hôtel quand il
-- consulte le tableau de disponibilité (isolation multihôtel).
-- NETTOIE les données de test à la fin (relançable).
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '33333333-0000-4000-8000-00000000000a';
  uidB text := '44444444-0000-4000-8000-00000000000b';
  r text;
  u_co text; u_dk text;
  n int;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  select "id" into h_dk from "Hotel" where code='DEMO-DK';
  if v_org is null or h_co is null or h_dk is null then
    raise exception 'Jeu de démo absent.';
  end if;

  select "id" into r from "Role" where "organisationId"=v_org and name='FRONT_DESK';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'fd-a@demo.local', 'A', 'Front', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'fd-b@demo.local', 'B', 'Front', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit UNIQUEMENT les chambres de Cotonou (7)
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "Room" rm where rm."hotelId"=''' || h_co || '''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucune chambre de son hôtel'; end if;
  execute 'select count(*) from "Room" rm where rm."hotelId"=''' || h_dk || '''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % chambres de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : voit UNIQUEMENT les chambres de Dakar
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "Room" rm where rm."hotelId"=''' || h_dk || '''' into n;
  if n < 1 then raise exception 'ECHEC: B ne voit aucune chambre de son hôtel'; end if;
  execute 'select count(*) from "Room" rm where rm."hotelId"=''' || h_co || '''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % chambres de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
