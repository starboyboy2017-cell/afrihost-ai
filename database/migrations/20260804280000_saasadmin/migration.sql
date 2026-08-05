-- ============================================================================
-- AfriHost AI — Module 33 : Super Administration (SaaS Control Center)
-- Migration : 20260804280000_saasadmin
--
-- Licences, support technique, monitoring, sauvegardes, impersonation sécurisée,
-- métriques SaaS. Réservé au Super Admin (RLS auth_platform_admin).
-- Ajoute :
--   * SaasLicense, SaasSupportTicket, SaasSupportMessage, SaasMonitorCheck,
--     SaasBackup, SaasImpersonation, SaasMetrics.
-- ============================================================================

-- Licence SaaS
CREATE TABLE "SaasLicense" (
    "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "subscriptionId" TEXT,
    "licenseKey" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "renewedAt" TIMESTAMP(3),
    "quotaAi" INTEGER NOT NULL DEFAULT 0, "quotaEmail" INTEGER NOT NULL DEFAULT 0,
    "quotaSms" INTEGER NOT NULL DEFAULT 0, "quotaWhatsapp" INTEGER NOT NULL DEFAULT 0, "quotaApi" INTEGER NOT NULL DEFAULT 0,
    "usedAi" INTEGER NOT NULL DEFAULT 0, "usedEmail" INTEGER NOT NULL DEFAULT 0,
    "usedSms" INTEGER NOT NULL DEFAULT 0, "usedWhatsapp" INTEGER NOT NULL DEFAULT 0, "usedApi" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasLicense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaasLicense_licenseKey_key" UNIQUE ("licenseKey")
);

-- Ticket de support
CREATE TABLE "SaasSupportTicket" (
    "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "hotelId" TEXT,
    "subject" TEXT NOT NULL, "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN', "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "slaDueAt" TIMESTAMP(3), "assignedTo" TEXT, "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasSupportTicket_pkey" PRIMARY KEY ("id")
);

-- Message de support
CREATE TABLE "SaasSupportMessage" (
    "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT, "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasSupportMessage_pkey" PRIMARY KEY ("id")
);

-- Check de monitoring
CREATE TABLE "SaasMonitorCheck" (
    "id" TEXT NOT NULL, "target" TEXT NOT NULL, "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UP', "latencyMs" INTEGER, "detail" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasMonitorCheck_pkey" PRIMARY KEY ("id")
);

-- Sauvegarde
CREATE TABLE "SaasBackup" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'AUTO',
    "status" TEXT NOT NULL DEFAULT 'PENDING', "sizeBytes" BIGINT NOT NULL DEFAULT 0, "url" TEXT,
    "scheduledAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasBackup_pkey" PRIMARY KEY ("id")
);

-- Impersonation sécurisée
CREATE TABLE "SaasImpersonation" (
    "id" TEXT NOT NULL, "superAdminId" TEXT NOT NULL, "targetUserId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL, "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3),
    CONSTRAINT "SaasImpersonation_pkey" PRIMARY KEY ("id")
);

-- Métriques SaaS
CREATE TABLE "SaasMetrics" (
    "id" TEXT NOT NULL, "period" TEXT NOT NULL, "periodStart" TIMESTAMP(3) NOT NULL, "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalHotels" INTEGER NOT NULL DEFAULT 0, "activeHotels" INTEGER NOT NULL DEFAULT 0, "suspendedHotels" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0, "totalRooms" INTEGER NOT NULL DEFAULT 0, "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0, "mrr" INTEGER NOT NULL DEFAULT 0, "arr" INTEGER NOT NULL DEFAULT 0,
    "retentionRate" DECIMAL NOT NULL DEFAULT 0, "churnRate" DECIMAL NOT NULL DEFAULT 0, "growth" DECIMAL NOT NULL DEFAULT 0,
    "aiUsage" INTEGER NOT NULL DEFAULT 0, "emailUsage" INTEGER NOT NULL DEFAULT 0, "smsUsage" INTEGER NOT NULL DEFAULT 0,
    "whatsappUsage" INTEGER NOT NULL DEFAULT 0, "apiUsage" INTEGER NOT NULL DEFAULT 0, "storageUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasMetrics_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "SaasLicense_organisationId_status_idx" ON "SaasLicense"("organisationId", "status");
CREATE INDEX "SaasSupportTicket_organisationId_status_idx" ON "SaasSupportTicket"("organisationId", "status");
CREATE INDEX "SaasSupportTicket_hotelId_idx" ON "SaasSupportTicket"("hotelId");
CREATE INDEX "SaasSupportMessage_ticketId_idx" ON "SaasSupportMessage"("ticketId");
CREATE INDEX "SaasMonitorCheck_target_checkedAt_idx" ON "SaasMonitorCheck"("target", "checkedAt");
CREATE INDEX "SaasBackup_status_createdAt_idx" ON "SaasBackup"("status", "createdAt");
CREATE INDEX "SaasImpersonation_superAdminId_startedAt_idx" ON "SaasImpersonation"("superAdminId", "startedAt");
CREATE INDEX "SaasMetrics_period_periodStart_idx" ON "SaasMetrics"("period", "periodStart");

-- Clés étrangères
ALTER TABLE "SaasSupportTicket" ADD CONSTRAINT "SaasSupportTicket_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaasSupportMessage" ADD CONSTRAINT "SaasSupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SaasSupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
