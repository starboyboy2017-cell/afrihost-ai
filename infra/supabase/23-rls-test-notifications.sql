-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 23 (Notifications multicanales)
-- Fichier : infra/supabase/23-rls-test-notifications.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les fournisseurs / envois de SON
-- hôtel, jamais ceux d'un autre. NETTOIE les données de test à la fin.
-- Utilise un rôle NON-admin (FRONT_DESK) pour tester l'isolation réelle.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := 'ccccc001-bbbb-4000-8000-0000000000cc';
  uidB text := 'ddddd001-bbbb-4000-8000-0000000000dd';
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
  values (gen_random_uuid()::text, v_org, 'notif-a@demo.local', 'A', 'Notif', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'notif-b@demo.local', 'B', 'Notif', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit ses fournisseurs (>=1), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "NotificationProvider" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucun fournisseur de son hôtel'; end if;
  execute 'select count(*) from "NotificationProvider" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % fournisseurs de Dakar (interdit)', n; end if;
  execute 'select count(*) from "NotificationSend" s join "Hotel" h on h.id=s."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 1 then raise exception 'ECHEC: A devrait voir 1 envoi de son hôtel (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun fournisseur ni envoi (0 partout)
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "NotificationProvider" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % fournisseurs de Dakar (attendu 0)', n; end if;
  execute 'select count(*) from "NotificationProvider" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % fournisseurs de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "NotificationSend" s join "Hotel" h on h.id=s."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % envois de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
