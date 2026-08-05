-- ============================================================================
-- AfriHost AI — Test d'isolation RLS pour le Module 24 (IA)
-- Fichier : infra/supabase/24-rls-test-ai.sql
--
-- Vérifie que chaque utilisateur ne voit QUE les données IA (fournisseurs,
-- prédictions, alertes) de SON hôtel. Utilise un rôle NON-admin (FRONT_DESK)
-- pour tester l'isolation réelle. NETTOIE les données de test.
-- ============================================================================

do $$
declare
  v_org text;
  h_co text; h_dk text;
  uidA text := 'eee00001-bbbb-4000-8000-0000000000ee';
  uidB text := 'fff00001-bbbb-4000-8000-0000000000ff';
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
  values (gen_random_uuid()::text, v_org, 'ai-a@demo.local', 'A', 'Ai', uidA, true, now()) returning id into u_co;
  insert into "User"(id, "organisationId", email, "firstName", "lastName", "authId", "isActive", "updatedAt")
  values (gen_random_uuid()::text, v_org, 'ai-b@demo.local', 'B', 'Ai', uidB, true, now()) returning id into u_dk;

  insert into "Membership"(id, "userId", "hotelId", "roleId", "isDefault", "createdAt")
  values (gen_random_uuid()::text, u_co, h_co, r, true, now()),
         (gen_random_uuid()::text, u_dk, h_dk, r, true, now());

  -- TEST A (Cotonou) : voit ses prédictions (>=1), 0 de Dakar
  perform set_config('request.jwt.claim.sub', uidA, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidA)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "AiPrediction" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n < 1 then raise exception 'ECHEC: A ne voit aucune prédiction de son hôtel'; end if;
  execute 'select count(*) from "AiPrediction" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-DK''' into n;
  if n <> 0 then raise exception 'ECHEC: A voit % prédictions de Dakar (interdit)', n; end if;
  execute 'select count(*) from "AiProvider" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 1 then raise exception 'ECHEC: A devrait voir 1 fournisseur LLM (vu %)', n; end if;
  execute 'set role postgres';

  -- TEST B (Dakar) : ne voit aucun fournisseur ni prédiction de Cotonou
  perform set_config('request.jwt.claim.sub', uidB, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uidB)::text, true);
  execute 'set role authenticated';
  execute 'select count(*) from "AiProvider" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % fournisseurs de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "AiPrediction" p join "Hotel" h on h.id=p."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % prédictions de Cotonou (interdit)', n; end if;
  execute 'select count(*) from "AiAlert" a join "Hotel" h on h.id=a."hotelId" where h.code=''DEMO-CO''' into n;
  if n <> 0 then raise exception 'ECHEC: B voit % alertes de Cotonou (interdit)', n; end if;
  execute 'set role postgres';

  -- NETTOYAGE
  delete from "Membership" where "userId" in (u_co, u_dk);
  delete from "User" where id in (u_co, u_dk);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
