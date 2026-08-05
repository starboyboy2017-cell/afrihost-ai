-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 27 (Événements & Groupes)
-- Fichier : infra/supabase/27-rls-test-events.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les groupes / événements de SON
-- hôtel. Utilise un rôle NON-admin (FRONT_DESK). NETTOIE les données.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '55ee0001-bbbb-4000-8000-000000000055';
  uidB text := '66ff0001-bbbb-4000-8000-000000000066';
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
  values (gen_random_uuid()::text, v_org, 'ev-a@demo.local', 'A', 'Events', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'ev-b@demo.local', 'B', 'Events', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit ses groupes (>=1) et sa salle, 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "EventGroup" g join "Hotel" h on h.id=g."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucun groupe de son hôtel'; end if;
  execute 'select count(*) from "EventGroup" g join "Hotel" h on h.id=g."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % groupes de Dakar (interdit)', n; end if;
  execute 'select count(*) from "EventVenue" v join "Hotel" h on h.id=v."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 1 then raise exception 'ECHEC: A devrait voir 1 salle (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun groupe ni événement de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "EventGroup" g join "Hotel" h on h.id=g."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % groupes de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "HotelEvent" e join "Hotel" h on h.id=e."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % événements de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
