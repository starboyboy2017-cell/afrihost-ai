-- ============================================================================
-- AfriHost AI — Module 31 : Plateforme Mobile
-- Migration : 20260804260000_mobile
--
-- PWA avancée + API-first. Ajoute :
--   * MobileDevice (appareils enregistrés) ;
--   * PushToken (tokens de notification push FCM/APNs/web) ;
--   * MobileSyncLog (journal de synchronisation offline).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Appareil mobile
CREATE TABLE "MobileDevice" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "userId" TEXT, "guestId" TEXT,
    "deviceName" TEXT, "platform" TEXT, "installId" TEXT NOT NULL,
    "lastActiveAt" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MobileDevice_installId_key" UNIQUE ("installId")
);

-- Token de notification push
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "deviceId" TEXT, "userId" TEXT, "guestId" TEXT,
    "platform" TEXT, "token" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PushToken_token_key" UNIQUE ("token")
);

-- Journal de synchronisation offline
CREATE TABLE "MobileSyncLog" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "deviceId" TEXT,
    "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "syncedAt" TIMESTAMP(3),
    CONSTRAINT "MobileSyncLog_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "MobileDevice_hotelId_idx" ON "MobileDevice"("hotelId");
CREATE INDEX "PushToken_hotelId_idx" ON "PushToken"("hotelId");
CREATE INDEX "MobileSyncLog_hotelId_status_idx" ON "MobileSyncLog"("hotelId", "status");

-- Clés étrangères
ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MobileSyncLog" ADD CONSTRAINT "MobileSyncLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
