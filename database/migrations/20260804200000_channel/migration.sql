-- ============================================================================
-- AfriHost AI — Module 25 : Channel Manager / OTA
-- Migration : 20260804200000_channel
--
-- Moteur de connecteurs générique (Connector Framework) : chaque OTA est un
-- connecteur indépendant. Provider-agnostic : aucune dépendance à une plateforme.
-- Ajoute :
--   * ChannelAccount (compte OTA configurable par hôtel) ;
--   * ChannelRoomMapping (mapping chambre PMS ↔ chambre OTA) ;
--   * ChannelSyncJob (file d'attente + reprise automatique) ;
--   * ChannelSyncLog (logs détaillés) ;
--   * ChannelRateOverride (historique des tarifs poussés).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Compte OTA
CREATE TABLE "ChannelAccount" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "otaKey" TEXT NOT NULL, "name" TEXT NOT NULL,
    "credentials" JSONB, "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false, "lastSyncAt" TIMESTAMP(3), "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelAccount_pkey" PRIMARY KEY ("id")
);

-- Mapping chambre PMS ↔ OTA
CREATE TABLE "ChannelRoomMapping" (
    "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "roomTypeId" TEXT NOT NULL,
    "otaRoomId" TEXT NOT NULL, "otaRoomName" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelRoomMapping_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChannelRoomMapping_accountId_roomTypeId_key" UNIQUE ("accountId", "roomTypeId")
);

-- Job de synchronisation (file d'attente)
CREATE TABLE "ChannelSyncJob" (
    "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "direction" TEXT NOT NULL, "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3, "payload" JSONB, "result" JSONB, "error" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelSyncJob_pkey" PRIMARY KEY ("id")
);

-- Log de synchronisation
CREATE TABLE "ChannelSyncLog" (
    "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "jobId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INFO', "message" TEXT NOT NULL, "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelSyncLog_pkey" PRIMARY KEY ("id")
);

-- Surcharge de tarif poussée à l'OTA
CREATE TABLE "ChannelRateOverride" (
    "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "roomTypeId" TEXT NOT NULL,
    "ratePlanId" TEXT, "date" TIMESTAMP(3) NOT NULL, "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF', "status" TEXT NOT NULL DEFAULT 'SYNCED', "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelRateOverride_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "ChannelAccount_hotelId_otaKey_idx" ON "ChannelAccount"("hotelId", "otaKey");
CREATE INDEX "ChannelRoomMapping_hotelId_idx" ON "ChannelRoomMapping"("hotelId");
CREATE INDEX "ChannelRoomMapping_accountId_idx" ON "ChannelRoomMapping"("accountId");
CREATE INDEX "ChannelSyncJob_hotelId_status_idx" ON "ChannelSyncJob"("hotelId", "status");
CREATE INDEX "ChannelSyncJob_accountId_status_nextRetryAt_idx" ON "ChannelSyncJob"("accountId", "status", "nextRetryAt");
CREATE INDEX "ChannelSyncLog_hotelId_createdAt_idx" ON "ChannelSyncLog"("hotelId", "createdAt");
CREATE INDEX "ChannelSyncLog_accountId_createdAt_idx" ON "ChannelSyncLog"("accountId", "createdAt");
CREATE INDEX "ChannelRateOverride_hotelId_date_idx" ON "ChannelRateOverride"("hotelId", "date");
CREATE INDEX "ChannelRateOverride_accountId_status_idx" ON "ChannelRateOverride"("accountId", "status");

-- Clés étrangères
ALTER TABLE "ChannelAccount" ADD CONSTRAINT "ChannelAccount_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChannelRoomMapping" ADD CONSTRAINT "ChannelRoomMapping_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelRoomMapping" ADD CONSTRAINT "ChannelRoomMapping_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChannelRoomMapping" ADD CONSTRAINT "ChannelRoomMapping_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChannelSyncJob" ADD CONSTRAINT "ChannelSyncJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelSyncJob" ADD CONSTRAINT "ChannelSyncJob_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChannelSyncLog" ADD CONSTRAINT "ChannelSyncLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelSyncLog" ADD CONSTRAINT "ChannelSyncLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChannelRateOverride" ADD CONSTRAINT "ChannelRateOverride_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelRateOverride" ADD CONSTRAINT "ChannelRateOverride_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
