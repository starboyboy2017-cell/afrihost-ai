-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Housekeeping (Module 9)
-- Fichier : database/seed/09-demo-housekeeping.sql
--
-- Simule une tâche de ménage générée après un check-out :
--   * la chambre 202 (Suite, Cotonou) passe en DIRTY ;
--   * une tâche PENDING haute priorité est créée ;
--   * un agent est affecté (ASSIGNED) ;
--   * la tâche est démarrée puis complétée avec horodatages (IN_PROGRESS / COMPLETED).
--
-- IDEMPOTENT (re-créée si la tâche de démo n'existe pas). NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text; room202 text;
  task_id text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05/06 requis)'; end if;

  -- Chambre 202 de Cotonou → DIRTY (comme après un check-out)
  select "id" into room202 from "Room" where "hotelId"=h_co and number='202';
  if room202 is null then raise exception 'Chambre 202 absente (seed 06 requis)'; end if;
  update "Room" set status='DIRTY', "updatedAt"=now() where id=room202;

  -- Créer une tâche de ménage de démo (si absente)
  select "id" into task_id from "HousekeepingTask" where "hotelId"=h_co and "roomId"=room202 and "notes"='Démo check-out' limit 1;
  if task_id is null then
    insert into "HousekeepingTask"(id, "hotelId", "roomId", status, priority, "assignedTo", "startedAt", "completedAt", "createdAt", "updatedAt")
    values (gen_random_uuid()::text, h_co, room202, 'COMPLETED', 'HIGH', 'agent-1',
            now() - interval '40 minutes', now() - interval '20 minutes', now() - interval '1 hour', now())
    returning id into task_id;

    -- Événements de la tâche (création, affectation, début, fin)
    insert into "HousekeepingTaskEvent"(id, "taskId", action, actor, detail, "createdAt") values
      (gen_random_uuid()::text, task_id, 'created', 'system', 'Générée après check-out', now() - interval '1 hour'),
      (gen_random_uuid()::text, task_id, 'assigned', 'manager-1', 'agent-1', now() - interval '55 minutes'),
      (gen_random_uuid()::text, task_id, 'started', 'agent-1', null, now() - interval '40 minutes'),
      (gen_random_uuid()::text, task_id, 'completed', 'agent-1', null, now() - interval '20 minutes');
  end if;
end $$;

-- Récapitulatif
select h.name as hotel, count(t.id) as taches, count(t.id) filter (where t.status='COMPLETED') as completes
from "Hotel" h left join "HousekeepingTask" t on t."hotelId"=h.id
where h.name like 'Hôtel Démo%' group by h.name order by h.name;
