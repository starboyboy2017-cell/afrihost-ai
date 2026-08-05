-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 11 (blanchisserie)
-- Fichier : infra/supabase/11-rls-test-laundry.sql
--
-- Vérifie que chaque utilisateur ne voit QUE le linge de SON hôtel.
-- NETTOIE les données de test à la fin (relançable).
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := '99999999-0000-4000-8000-00000000000a';
  uidB text := 'aaaaaaaa-1111-4000-8000-00000000000b';
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

  select "id" into r from "Role" where "organisationId"=v_org and name='STOCK_MANAGER';

  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'la-a@demo.local', 'A', 'Laundry', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'la-b@demo.local', 'B', 'Laundry', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit le linge de son hôtel, 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "LaundryItem" i join "Hotel" h on h.id=i."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucune pièce de son hôtel'; end if;
  execute 'select count(*) from "LaundryItem" i join "Hotel" h on h.id=i."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % pièces de Dakar (interdit)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : voit uniquement ses pièces (0)
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "LaundryItem" i join "Hotel" h on h.id=i."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % pièces de Dakar (attendu 0)', n; end if;
  execute 'select count(*) from "LaundryItem" i join "Hotel" h on h.id=i."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % pièces de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
