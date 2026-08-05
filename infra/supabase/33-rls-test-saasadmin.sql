-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 33 (Super Administration)
-- Fichier : infra/supabase/33-rls-test-saasadmin.sql
--
-- Vérifie que les entités Super Admin (licences, monitoring, sauvegardes,
-- métriques) sont UNIQUEMENT accessibles au Super Admin, jamais à un
-- HOTEL_OWNER. NETTOIE.
-- ============================================================================

do $$
declare
  v_org text; h_co text;
  uidSA text := '11ab0001-bbbb-4000-8000-000000000011'; -- Super Admin
  uidHO text := '22cd0001-bbbb-4000-8000-000000000022'; -- Hotel Owner
  r_sa text; r_ho text; u_sa text; u_ho text;
  n int;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if v_org is null then raise exception 'Organisation de démo absente.'; end if;

  select "id" into r_sa from "Role" where "organisationId"=v_org and name='PLATFORM_ADMIN';
  select "id" into r_ho from "Role" where "organisationId"=v_org and name='HOTEL_OWNER';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'sa33@platform.local', 'S', 'Admin', uidSA, true, now()) returning id into u_sa;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'owner33@demo.local', 'O', 'Owner', uidHO, true, now()) returning id into u_ho;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_sa, h_co, r_sa, true, now()),
         (gen_random_uuid()::text, u_ho, h_co, r_ho, true, now());

  -- Super Admin : voit les licences, métriques, sauvegardes
  perform set_config('request.jwt.claim.sub', uidSA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidSA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "SaasLicense"' into n;
  if n < 1 then raise exception 'ECHEC: Super Admin devrait voir >=1 licence'; end if;
  execute 'select count(*) from "SaasMetrics"' into n;
  if n < 1 then raise exception 'ECHEC: Super Admin devrait voir >=1 métrique'; end if;
  execute 'set role postgres';

  -- Hotel Owner : ne voit AUCUNE entité Super Admin
  perform set_config('request.jwt.claim.sub', uidHO, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidHO)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "SaasLicense"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % licences (interdit)', n; end if;
  execute 'select count(*) from "SaasMetrics"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % métriques (interdit)', n; end if;
  execute 'select count(*) from "SaasBackup"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % sauvegardes (interdit)', n; end if;
  execute 'select count(*) from "SaasMonitorCheck"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % checks (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_sa, u_ho);
  delete from "User" where id in (u_sa, u_ho);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
