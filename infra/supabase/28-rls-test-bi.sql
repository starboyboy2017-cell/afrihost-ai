-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 28 (Reporting & BI)
-- Fichier : infra/supabase/28-rls-test-bi.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les tableaux de bord / rapports de
-- SON hôtel. Utilise un rôle NON-admin (CASHIER, a bi.view). NETTOIE.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '77aa0001-bbbb-4000-8000-000000000077';
  uidB text := '88bb0001-bbbb-4000-8000-000000000088';
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

  select "id" into r from "Role" where "organisationId"=v_org and name='CASHIER';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'bi-a@demo.local', 'A', 'Bi', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'bi-b@demo.local', 'B', 'Bi', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit ses tableaux de bord (>=2), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "BiDashboard" d join "Hotel" h on h.id=d."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 2 then raise exception 'ECHEC: A devrait voir >=2 tableaux (vu %)', n; end if;
  execute 'select count(*) from "BiDashboard" d join "Hotel" h on h.id=d."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % tableaux de Dakar (interdit)', n; end if;
  execute 'select count(*) from "BiReport" r join "Hotel" h on h.id=r."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 1 then raise exception 'ECHEC: A devrait voir 1 rapport (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun tableau ni rapport de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "BiDashboard" d join "Hotel" h on h.id=d."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % tableaux de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "BiSchedule" s join "Hotel" h on h.id=s."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % planifications de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
