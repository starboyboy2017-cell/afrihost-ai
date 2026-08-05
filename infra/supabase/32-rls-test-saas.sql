-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 32 (Billing SaaS)
-- Fichier : infra/supabase/32-rls-test-saas.sql
--
-- Vérifie que les entités SaaS sont UNIQUEMENT accessibles au Super Admin
-- (PLATFORM_ADMIN), et JAMAIS à un admin d'hôtel (HOTEL_OWNER) ni au portail.
-- NETTOIE les données de test.
-- ============================================================================

do $$
declare
  v_org text;
  uidSA text := 'ddcc0001-bbbb-4000-8000-0000000000dd'; -- Super Admin
  uidHO text := 'eeaa0001-bbbb-4000-8000-0000000000ee'; -- Hotel Owner
  r_sa text; r_ho text;
  u_sa text; u_ho text;
  h_co text;
  n int;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if v_org is null then raise exception 'Organisation de démo absente.'; end if;

  select "id" into r_sa from "Role" where "organisationId"=v_org and name='PLATFORM_ADMIN';
  select "id" into r_ho from "Role" where "organisationId"=v_org and name='HOTEL_OWNER';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'sa@platform.local', 'Super', 'Admin', uidSA, true, now()) returning id into u_sa;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'owner@demo.local', 'Owner', 'Hotel', uidHO, true, now()) returning id into u_ho;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_sa, h_co, r_sa, true, now()),
         (gen_random_uuid()::text, u_ho, h_co, r_ho, true, now());

  -- TEST Super Admin : voit les plans SaaS (>=3)
  perform set_config('request.jwt.claim.sub', uidSA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidSA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "SaasPlan"' into n;
  if n < 3 then raise exception 'ECHEC: Super Admin devrait voir >=3 plans (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST Hotel Owner : ne voit AUCUN plan SaaS (interdit)
  perform set_config('request.jwt.claim.sub', uidHO, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidHO)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "SaasPlan"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % plans SaaS (interdit)', n; end if;
  execute 'select count(*) from "SaasPaymentMethod"' into n;
  if n <> 0 then raise exception 'ECHEC: Hotel Owner voit % moyens de paiement SaaS (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_sa, u_ho);
  delete from "User" where id in (u_sa, u_ho);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
