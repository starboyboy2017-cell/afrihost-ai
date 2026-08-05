-- ============================================================================
-- AfriHost AI — Module 9 : Housekeeping (tâches de ménage)
-- Migration : 20260804040000_housekeeping
--
-- Enrichit HousekeepingTask avec :
--   * horodatages des étapes (startedAt, verifiedAt, updatedAt) → mesure des
--     temps de nettoyage ;
--   * index sur assignedTo (affectation) ;
--   * FK vers Hotel (pour le RLS multihôtel).
-- Aucune table nouvelle (le cycle PENDING/ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED
-- et la priorité existaient déjà).
-- ============================================================================

-- Colonnes d'horodatage + updatedAt
ALTER TABLE "HousekeepingTask" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Index sur assignedTo (affectation / réaffectation)
CREATE INDEX "HousekeepingTask_assignedTo_idx" ON "HousekeepingTask"("assignedTo");

-- FK vers Hotel (RLS multihôtel)
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Table des événements de tâche (historique / réaffectations)
CREATE TABLE "HousekeepingTaskEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HousekeepingTaskEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HousekeepingTaskEvent_taskId_idx" ON "HousekeepingTaskEvent"("taskId");
ALTER TABLE "HousekeepingTaskEvent" ADD CONSTRAINT "HousekeepingTaskEvent_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "HousekeepingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
