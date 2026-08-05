-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 29 (Administration)
-- Fichier : infra/supabase/29-rls-test-admin.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les configs de SON hôtel (scope
-- HOTEL), jamais celles d'un autre hôtel. Utilise un rôle NON-admin. NETTOIE.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '99aa0001-bbbb-4000-8000-000000000099';
  uidB text := 'aabb0001-bbbb-4000-8000-0000000000aa';
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

  -- Rôle avec admin.view : ACCOUNTANT
  select "id" into r from "Role" where "organisationId"=v_org and name='ACCOUNTANT';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'adm-a@demo.local', 'A', 'Admin', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'adm-b@demo.local', 'B', 'Admin', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit ses configs HOTEL (>=5), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "AdminConfig" c join "Hotel" h on h.id=c."hotelId" where h.code=''DEMO-CO'' and c.scope=''HOTEL''' into n;
  if n < 5 then raise exception 'ECHEC: A devrait voir >=5 configs (vu %)', n; end if;
  execute 'select count(*) from "AdminConfig" c join "Hotel" h on h.id=c."hotelId" where h.code=''DEMO-DK'' and c.scope=''HOTEL''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % configs de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucune config de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "AdminConfig" c join "Hotel" h on h.id=c."hotelId" where h.code=''DEMO-CO'' and c.scope=''HOTEL''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % configs de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
