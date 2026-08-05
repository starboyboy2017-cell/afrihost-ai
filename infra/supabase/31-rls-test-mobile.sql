-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 31 (Plateforme Mobile)
-- Fichier : infra/supabase/31-rls-test-mobile.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les appareils / tokens / syncs de
-- SON hôtel. Utilise un rôle NON-admin (FRONT_DESK). NETTOIE.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := 'ccdd0001-bbbb-4000-8000-0000000000cc';
  uidB text := 'eeff0001-bbbb-4000-8000-0000000000ee';
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
  values (gen_random_uuid()::text, v_org, 'mob-a@demo.local', 'A', 'Mobile', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'mob-b@demo.local', 'B', 'Mobile', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit son appareil (>=1), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "MobileDevice" d join "Hotel" h on h.id=d."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucun appareil de son hôtel'; end if;
  execute 'select count(*) from "MobileDevice" d join "Hotel" h on h.id=d."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % appareils de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun appareil ni token de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "MobileDevice" d join "Hotel" h on h.id=d."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % appareils de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "PushToken" t join "Hotel" h on h.id=t."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % tokens de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
