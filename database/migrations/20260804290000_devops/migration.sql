-- ============================================================================
-- AfriHost AI — Module 34 : Production Readiness, DevOps & Sécurité Entreprise
-- Migration : 20260804290000_devops
--
-- Health dashboard, incidents de sécurité, rotation des secrets, intégrité des
-- sauvegardes. Réservé au Super Admin (RLS auth_platform_admin).
-- ============================================================================

-- Check d'état de santé
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL, "component" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'UP',
    "latencyMs" INTEGER, "region" TEXT, "detail" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- Incident de sécurité
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL, "type" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'LOW',
    "source" TEXT, "detail" TEXT, "status" TEXT NOT NULL DEFAULT 'OPEN', "ip" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- Rotation des secrets
CREATE TABLE "SecretRotation" (
    "id" TEXT NOT NULL, "secretKey" TEXT NOT NULL, "provider" TEXT,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "triggeredBy" TEXT, "reason" TEXT,
    CONSTRAINT "SecretRotation_pkey" PRIMARY KEY ("id")
);

-- Vérification d'intégrité de sauvegarde
CREATE TABLE "IntegrityCheck" (
    "id" TEXT NOT NULL, "backupId" TEXT, "target" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checksum" TEXT, "detail" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrityCheck_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "HealthCheck_component_checkedAt_idx" ON "HealthCheck"("component", "checkedAt");
CREATE INDEX "SecurityIncident_type_status_idx" ON "SecurityIncident"("type", "status");
CREATE INDEX "SecurityIncident_createdAt_idx" ON "SecurityIncident"("createdAt");
CREATE INDEX "SecretRotation_secretKey_rotatedAt_idx" ON "SecretRotation"("secretKey", "rotatedAt");
CREATE INDEX "IntegrityCheck_backupId_checkedAt_idx" ON "IntegrityCheck"("backupId", "checkedAt");
