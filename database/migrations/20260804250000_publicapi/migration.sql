-- ============================================================================
-- AfriHost AI — Module 30 : API Publique & Marketplace
-- Migration : 20260804250000_publicapi
--
-- API REST (GraphQL prévu) pour développeurs tiers : applications, credentials
-- (API Key / OAuth2 / JWT), webhooks, marketplace, journalisation.
-- Ajoute :
--   * ApiApp, ApiCredential, ApiWebhook, ApiWebhookDelivery,
--     ApiMarketplaceApp, ApiAccessLog.
--
-- Ces entités sont globales (cross-hôtel) : les credentials scoped par hôtels
-- autorisés garantissent l'isolation multi-hôtel côté application.
-- ============================================================================

-- Application tierce
CREATE TABLE "ApiApp" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
    "ownerOrgId" TEXT, "ownerUserId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX', "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiApp_pkey" PRIMARY KEY ("id")
);

-- Crédential (API Key / OAuth2 / JWT)
CREATE TABLE "ApiCredential" (
    "id" TEXT NOT NULL, "appId" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'API_KEY',
    "clientId" TEXT NOT NULL, "secretHash" TEXT NOT NULL, "scopes" TEXT[], "hotels" TEXT[],
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX', "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "lastUsedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ApiCredential_clientId_key" UNIQUE ("clientId")
);

-- Webhook
CREATE TABLE "ApiWebhook" (
    "id" TEXT NOT NULL, "appId" TEXT NOT NULL, "hotelId" TEXT, "url" TEXT NOT NULL,
    "secret" TEXT, "events" TEXT[], "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiWebhook_pkey" PRIMARY KEY ("id")
);

-- Livraison de webhook
CREATE TABLE "ApiWebhookDelivery" (
    "id" TEXT NOT NULL, "webhookId" TEXT NOT NULL, "event" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB, "response" TEXT, "error" TEXT, "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- Application marketplace
CREATE TABLE "ApiMarketplaceApp" (
    "id" TEXT NOT NULL, "appId" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT NOT NULL,
    "summary" TEXT, "iconUrl" TEXT, "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isPublished" BOOLEAN NOT NULL DEFAULT false, "installs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiMarketplaceApp_pkey" PRIMARY KEY ("id")
);

-- Journal des accès
CREATE TABLE "ApiAccessLog" (
    "id" TEXT NOT NULL, "appId" TEXT, "credentialId" TEXT, "hotelId" TEXT,
    "method" TEXT NOT NULL, "path" TEXT NOT NULL, "status" INTEGER NOT NULL,
    "latencyMs" INTEGER, "ip" TEXT, "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiAccessLog_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "ApiCredential_clientId_idx" ON "ApiCredential"("clientId");
CREATE INDEX "ApiWebhook_hotelId_idx" ON "ApiWebhook"("hotelId");
CREATE INDEX "ApiWebhookDelivery_webhookId_status_idx" ON "ApiWebhookDelivery"("webhookId", "status");
CREATE INDEX "ApiMarketplaceApp_isPublished_idx" ON "ApiMarketplaceApp"("isPublished");
CREATE INDEX "ApiAccessLog_appId_createdAt_idx" ON "ApiAccessLog"("appId", "createdAt");
CREATE INDEX "ApiAccessLog_credentialId_createdAt_idx" ON "ApiAccessLog"("credentialId", "createdAt");
CREATE INDEX "ApiAccessLog_hotelId_createdAt_idx" ON "ApiAccessLog"("hotelId", "createdAt");

-- Clés étrangères
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_appId_fkey" FOREIGN KEY ("appId") REFERENCES "ApiApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiWebhook" ADD CONSTRAINT "ApiWebhook_appId_fkey" FOREIGN KEY ("appId") REFERENCES "ApiApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiWebhookDelivery" ADD CONSTRAINT "ApiWebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "ApiWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiMarketplaceApp" ADD CONSTRAINT "ApiMarketplaceApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "ApiApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccessLog" ADD CONSTRAINT "ApiAccessLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "ApiApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiAccessLog" ADD CONSTRAINT "ApiAccessLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ApiCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
