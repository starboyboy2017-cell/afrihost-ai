-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 34 (DevOps & Sécurité)
-- Fichier : infra/supabase/34-rls-test-devops.sql
--
-- Vérifie que les entités DevOps (HealthCheck, SecurityIncident, SecretRotation,
-- IntegrityCheck) sont UNIQUEMENT accessibles au Super Admin, jamais à un
-- HOTEL_OWNER. NETTOIE.
-- ============================================================================

do $$
declare
  v_org text; h_co text;
  uidSA text := '33ab0001-bbbb-4000-8000-000000000033';
  uidHO text := '44cd0001-bbbb-4000-8000-000000000044';
  r_sa text; r_ho text; u_sa text; u_ho text;
  n int;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if v_org is null then raise exception 'Organisation de démo absente.'; end if;

  select "id" into r_sa from "Role" where "organisationId"=v_org and name='PLATFORM_ADMIN';
  select "id" into r_ho from "Role" where "organisationId"=v_org and name='HOTEL_OWNER';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'sa34@platform.local', 'S', 'Admin', uidSA, true, now()) returning id into u_sa;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'owner34@demo.local', 'O', 'Owner', uidHO, true, now()) returning id into u_ho;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_sa, h_co, r_sa, true, now()),
         (gen_random_uuid()::text, u_ho, h_co, r_ho, true, now());

  -- Super Admin : voit les health checks (>=1)
  perform set_config('request.jwt.claim.sub', uidSA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidSA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "HealthCheck"' into n;
  if n < 1 then raise exception 'ECHEC: Super Admin devrait voir >=1 health check'; end if;
  execute 'set role postgres';

  -- Hotel Owner : ne voit AUCUNE entité DevOps
  perform set_config('request.jwt.claim.sub', uidHO, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidHO)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "HealthCheck"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % health checks (interdit)', n; end if;
  execute 'select count(*) from "SecurityIncident"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % incidents (interdit)', n; end if;
  execute 'select count(*) from "SecretRotation"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % rotations (interdit)', n; end if;
  execute 'select count(*) from "IntegrityCheck"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % checks intégrité (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_sa, u_ho);
  delete from "User" where id in (u_sa, u_ho);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
