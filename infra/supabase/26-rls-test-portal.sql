-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 26 (Portail Client)
-- Fichier : infra/supabase/26-rls-test-portal.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les comptes portail / messages de
-- SON hôtel. Utilise un rôle NON-admin (FRONT_DESK). NETTOIE les données.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '33cc0001-bbbb-4000-8000-000000000033';
  uidB text := '44dd0001-bbbb-4000-8000-000000000044';
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
  values (gen_random_uuid()::text, v_org, 'portal-a@demo.local', 'A', 'Portal', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'portal-b@demo.local', 'B', 'Portal', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit son compte portail (>=1), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "PortalUser" u join "Hotel" h on h.id=u."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucun compte portail de son hôtel'; end if;
  execute 'select count(*) from "PortalUser" u join "Hotel" h on h.id=u."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % comptes de Dakar (interdit)', n; end if;
  execute 'select count(*) from "PortalMessage" m join "Hotel" h on h.id=m."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 1 then raise exception 'ECHEC: A devrait voir 1 message (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun compte ni message de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "PortalUser" u join "Hotel" h on h.id=u."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % comptes de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "PortalServiceRequest" s join "Hotel" h on h.id=s."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % demandes de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
