-- ============================================================================
-- AfriHost AI — Module 23 : Notifications multicanales
-- Migration : 20260804180000_notifications
--
-- Système centralisé, agnostique fournisseur (provider-agnostic).
-- Ajoute :
--   * enums NotificationChannel (étendu), NotificationStatus (étendu),
--     NotificationProviderType, NotificationEventType, NotificationPriority ;
--   * tables : NotificationProvider, NotificationTemplate, NotificationTrigger,
--     NotificationCampaign, NotificationSend ;
--   * la table Notification existante est enrichie (colonnes additives).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS). Les identifiants
-- d'enums existants sont préservés (ajout de valeurs par ADD VALUE).
-- ============================================================================

-- Extension des enums existants (ajout de valeurs, jamais de suppression)
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'VOICE';
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'IN_APP';
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'READ';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'CLICKED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "NotificationProviderType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'VOICE', 'OTHER');
CREATE TYPE "NotificationEventType" AS ENUM (
  'RESERVATION_CONFIRMED', 'RESERVATION_CANCELLED', 'RESERVATION_CREATED',
  'CHECK_IN', 'CHECK_OUT', 'NO_SHOW',
  'PAYMENT_RECEIVED', 'INVOICE_PAID',
  'PROMOTION', 'LOYALTY_POINTS', 'LOYALTY_TIER',
  'HOUSEKEEPING', 'MAINTENANCE', 'TRANSPORT', 'LAUNDRY',
  'WELCOME', 'CUSTOM'
);
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Fournisseur configurable par hôtel
CREATE TABLE "NotificationProvider" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL, "providerType" "NotificationProviderType" NOT NULL,
    "providerKey" TEXT NOT NULL, "credentials" JSONB, "config" JSONB,
    "fromAddress" TEXT, "domain" TEXT, "replyTo" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationProvider_pkey" PRIMARY KEY ("id")
);

-- Template multilingue
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "channel" "NotificationChannel" NOT NULL,
    "eventType" "NotificationEventType" NOT NULL, "code" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'fr',
    "subject" TEXT, "body" TEXT NOT NULL, "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NotificationTemplate_hotelId_channel_code_locale_key" UNIQUE ("hotelId", "channel", "code", "locale")
);

-- Déclencheur automatique
CREATE TABLE "NotificationTrigger" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "eventType" "NotificationEventType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL, "templateCode" TEXT NOT NULL, "condition" JSONB,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL', "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationTrigger_pkey" PRIMARY KEY ("id")
);

-- Campagne programmée
CREATE TABLE "NotificationCampaign" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL, "templateCode" TEXT NOT NULL, "segmentId" TEXT,
    "audience" JSONB, "scheduleAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3), "config" JSONB, "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- Envoi (file d'attente + historique + suivi)
CREATE TABLE "NotificationSend" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "notificationId" TEXT, "campaignId" TEXT,
    "channel" "NotificationChannel" NOT NULL, "eventType" "NotificationEventType", "templateCode" TEXT,
    "providerId" TEXT, "recipientType" TEXT NOT NULL, "recipientId" TEXT NOT NULL, "recipient" TEXT,
    "subject" TEXT, "body" TEXT, "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "attempts" INTEGER NOT NULL DEFAULT 0, "maxAttempts" INTEGER NOT NULL DEFAULT 3, "nextRetryAt" TIMESTAMP(3),
    "providerRef" TEXT, "error" TEXT, "payload" JSONB,
    "scheduledAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationSend_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "NotificationProvider_hotelId_channel_idx" ON "NotificationProvider"("hotelId", "channel");
CREATE INDEX "NotificationProvider_hotelId_isActive_idx" ON "NotificationProvider"("hotelId", "isActive");
CREATE INDEX "NotificationTemplate_hotelId_eventType_idx" ON "NotificationTemplate"("hotelId", "eventType");
CREATE INDEX "NotificationTrigger_hotelId_eventType_isActive_idx" ON "NotificationTrigger"("hotelId", "eventType", "isActive");
CREATE INDEX "NotificationCampaign_hotelId_status_idx" ON "NotificationCampaign"("hotelId", "status");
CREATE INDEX "NotificationSend_hotelId_status_idx" ON "NotificationSend"("hotelId", "status");
CREATE INDEX "NotificationSend_hotelId_status_nextRetryAt_idx" ON "NotificationSend"("hotelId", "status", "nextRetryAt");
CREATE INDEX "NotificationSend_campaignId_idx" ON "NotificationSend"("campaignId");
CREATE INDEX "NotificationSend_recipientId_idx" ON "NotificationSend"("recipientId");

-- Clés étrangères
ALTER TABLE "NotificationProvider" ADD CONSTRAINT "NotificationProvider_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationTrigger" ADD CONSTRAINT "NotificationTrigger_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationCampaign" ADD CONSTRAINT "NotificationCampaign_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotificationSend" ADD CONSTRAINT "NotificationSend_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationSend" ADD CONSTRAINT "NotificationSend_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "NotificationProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationSend" ADD CONSTRAINT "NotificationSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationSend" ADD CONSTRAINT "NotificationSend_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
