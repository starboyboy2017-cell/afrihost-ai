-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 22 (Programme de fidélité)
-- Fichier : infra/supabase/22-rls-test-loyalty.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les programmes / membres de SON
-- hôtel (ou groupe d'hôtels auquel il appartient), jamais ceux d'un autre hôtel.
-- NETTOIE les données de test à la fin (relançable).
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := 'aaaaaaa1-bbbb-4000-8000-0000000000aa';
  uidB text := 'bbbbbbb1-bbbb-4000-8000-0000000000bb';
  r text;
  u_co text; u_dk text;
  n int;
  p_co text;
begin
  select "id" into v_org from "Organisation" where name='Organisation Démo';
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  select "id" into h_dk from "Hotel" where code='DEMO-DK';
  if v_org is null or h_co is null or h_dk is null then
    raise exception 'Jeu de démo absent.';
  end if;

  -- Utilise un rôle NON-admin (FRONT_DESK) : un admin d'organisation (HOTEL_OWNER)
  -- a volontairement un accès large sur toute l'organisation, ce qui n'est pas
  -- le but de ce test d'isolation par hôtel.
  select "id" into r from "Role" where "organisationId"=v_org and name='FRONT_DESK';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'loyalty-a@demo.local', 'A', 'Loyalty', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'loyalty-b@demo.local', 'B', 'Loyalty', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit le programme AfriPoints et ses membres
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "LoyaltyProgram" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucun programme de son hôtel'; end if;
  select count(*) into n from "LoyaltyProgram" p join "Hotel" h on h.id=p."hotelId" where h.code='DEMO-DK';
  if n <> 0 then raise exception 'ECHEC: A voit % programmes de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit AUCUN programme/membre (rien sur Dakar) et rien de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  select count(*) into n from "LoyaltyProgram" p join "Hotel" h on h.id=p."hotelId" where h.code='DEMO-DK';
  if n <> 0 then raise exception 'ECHEC: B voit % programmes de Dakar (attendu 0)', n; end if;
  select count(*) into n from "LoyaltyProgram" p join "Hotel" h on h.id=p."hotelId" where h.code='DEMO-CO';
  if n <> 0 then raise exception 'ECHEC: B voit % programmes de Cotonou (interdit)', n; end if;
  select count(*) into n from "LoyaltyMember" m join "Hotel" h on h.id=m."hotelId" where h.code='DEMO-CO';
  if n <> 0 then raise exception 'ECHEC: B voit % membres de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
