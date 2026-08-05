-- ============================================================================
-- AfriHost AI — Module 28 : Reporting & Business Intelligence
-- Migration : 20260804230000_bi
--
-- Tableaux de bord dynamiques, rapports, planification par email.
-- Ajoute :
--   * BiDashboard, BiReport, BiSchedule.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Tableau de bord (personnalisable par rôle)
CREATE TABLE "BiDashboard" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "role" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'HOTEL', "layout" JSONB, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiDashboard_pkey" PRIMARY KEY ("id")
);

-- Rapport
CREATE TABLE "BiReport" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OPERATIONAL', "type" TEXT NOT NULL,
    "filters" JSONB, "groupBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiReport_pkey" PRIMARY KEY ("id")
);

-- Planification d'envoi par email
CREATE TABLE "BiSchedule" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "reportId" TEXT, "email" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY', "format" TEXT NOT NULL DEFAULT 'PDF', "time" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BiSchedule_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "BiDashboard_hotelId_role_idx" ON "BiDashboard"("hotelId", "role");
CREATE INDEX "BiReport_hotelId_category_idx" ON "BiReport"("hotelId", "category");
CREATE INDEX "BiSchedule_hotelId_isActive_idx" ON "BiSchedule"("hotelId", "isActive");

-- Clés étrangères
ALTER TABLE "BiDashboard" ADD CONSTRAINT "BiDashboard_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiReport" ADD CONSTRAINT "BiReport_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiSchedule" ADD CONSTRAINT "BiSchedule_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BiSchedule" ADD CONSTRAINT "BiSchedule_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "BiReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
