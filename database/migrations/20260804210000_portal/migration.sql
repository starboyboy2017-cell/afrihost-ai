-- ============================================================================
-- AfriHost AI — Module 26 : Portail Client (PWA, API-first)
-- Migration : 20260804210000_portal
--
-- Espace client : réservations, factures, fidélité, messagerie, demandes de
-- services, appareils connectés. Ajoute :
--   * PortalUser (compte + authentification email/téléphone/OTP) ;
--   * PortalDevice (sessions / appareils) ;
--   * PortalMessage (messagerie sécurisée) ;
--   * PortalServiceRequest (demandes de services) ;
--   * PortalNotification (notifications / offres personnalisées).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Compte portail
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "email" TEXT, "phone" TEXT, "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false, "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpHash" TEXT, "otpExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortalUser_guestId_key" UNIQUE ("guestId")
);

-- Appareil / session
CREATE TABLE "PortalDevice" (
    "id" TEXT NOT NULL, "portalUserId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "deviceName" TEXT, "platform" TEXT, "token" TEXT, "lastSeenAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalDevice_pkey" PRIMARY KEY ("id")
);

-- Message sécurisé
CREATE TABLE "PortalMessage" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "portalUserId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'CLIENT_TO_HOTEL', "subject" TEXT, "body" TEXT NOT NULL,
    "readByHotel" BOOLEAN NOT NULL DEFAULT false, "readByGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalMessage_pkey" PRIMARY KEY ("id")
);

-- Demande de service
CREATE TABLE "PortalServiceRequest" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "portalUserId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL, "title" TEXT NOT NULL, "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalServiceRequest_pkey" PRIMARY KEY ("id")
);

-- Notification / offre
CREATE TABLE "PortalNotification" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "portalUserId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT, "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalNotification_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "PortalUser_hotelId_idx" ON "PortalUser"("hotelId");
CREATE INDEX "PortalUser_email_idx" ON "PortalUser"("email");
CREATE INDEX "PortalUser_phone_idx" ON "PortalUser"("phone");
CREATE INDEX "PortalDevice_portalUserId_idx" ON "PortalDevice"("portalUserId");
CREATE INDEX "PortalDevice_hotelId_idx" ON "PortalDevice"("hotelId");
CREATE INDEX "PortalMessage_portalUserId_idx" ON "PortalMessage"("portalUserId");
CREATE INDEX "PortalMessage_hotelId_idx" ON "PortalMessage"("hotelId");
CREATE INDEX "PortalServiceRequest_portalUserId_idx" ON "PortalServiceRequest"("portalUserId");
CREATE INDEX "PortalServiceRequest_hotelId_status_idx" ON "PortalServiceRequest"("hotelId", "status");
CREATE INDEX "PortalNotification_portalUserId_read_idx" ON "PortalNotification"("portalUserId", "read");
CREATE INDEX "PortalNotification_hotelId_idx" ON "PortalNotification"("hotelId");

-- Clés étrangères
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalDevice" ADD CONSTRAINT "PortalDevice_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalDevice" ADD CONSTRAINT "PortalDevice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalServiceRequest" ADD CONSTRAINT "PortalServiceRequest_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalServiceRequest" ADD CONSTRAINT "PortalServiceRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortalServiceRequest" ADD CONSTRAINT "PortalServiceRequest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalNotification" ADD CONSTRAINT "PortalNotification_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalNotification" ADD CONSTRAINT "PortalNotification_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortalNotification" ADD CONSTRAINT "PortalNotification_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
