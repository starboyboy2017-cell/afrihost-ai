-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 25 (Channel Manager / OTA)
-- Fichier : infra/supabase/25-rls-test-channel.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les comptes OTA / jobs / logs de
-- SON hôtel. Utilise un rôle NON-admin (FRONT_DESK). NETTOIE les données.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '11aa0001-bbbb-4000-8000-000000000011';
  uidB text := '22bb0001-bbbb-4000-8000-000000000022';
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
  values (gen_random_uuid()::text, v_org, 'ch-a@demo.local', 'A', 'Channel', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'ch-b@demo.local', 'B', 'Channel', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit ses comptes OTA (>=3), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "ChannelAccount" a join "Hotel" h on h.id=a."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 3 then raise exception 'ECHEC: A devrait voir >=3 comptes OTA (vu %)', n; end if;
  execute 'select count(*) from "ChannelAccount" a join "Hotel" h on h.id=a."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % comptes de Dakar (interdit)', n; end if;
  execute 'select count(*) from "ChannelSyncJob" j join "Hotel" h on h.id=j."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 1 then raise exception 'ECHEC: A devrait voir 1 job (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun compte ni job de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "ChannelAccount" a join "Hotel" h on h.id=a."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % comptes de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "ChannelSyncLog" l join "Hotel" h on h.id=l."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % logs de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
