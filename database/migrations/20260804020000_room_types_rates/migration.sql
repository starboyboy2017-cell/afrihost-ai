-- ============================================================================
-- AfriHost AI — Module 5 : Types de chambres & tarifs flexibles
-- Migration : 20260804020000_room_types_rates
--
-- Ajoute un modèle de TARIFICATION FLEXIBLE (pour éviter une refonte ultérieure) :
--   * RatePlan            : plan tarifaire (BASE / SEASONAL / WEEKEND / PROMOTIONAL)
--                           — plusieurs plans par type de chambre, par saison/période ;
--   * RatePlanPrice       : prix du plan par DEVISE (multi-pays) — minor units / nuit ;
--   * RatePlanRestriction : restrictions futures (séjour min/max, réservation à
--                           l'avance, capacité) et promotions.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS). Les tarifs sont PAR
-- TYPE DE CHAMBRE et PAR HÔTEL (jamais partagés entre hôtels).
-- ============================================================================

-- Enum du type de plan tarifaire
CREATE TYPE "RatePlanType" AS ENUM ('BASE', 'SEASONAL', 'WEEKEND', 'PROMOTIONAL');

-- Table des plans tarifaires
CREATE TABLE "RatePlan" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RatePlanType" NOT NULL DEFAULT 'BASE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- Table des prix par devise
CREATE TABLE "RatePlanPrice" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatePlanPrice_pkey" PRIMARY KEY ("id")
);

-- Table des restrictions
CREATE TABLE "RatePlanRestriction" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "minNights" INTEGER,
    "maxNights" INTEGER,
    "advanceBookingDays" INTEGER,
    "minAdvanceBookingDays" INTEGER,
    "maxGuests" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RatePlanRestriction_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "RatePlan_hotelId_idx" ON "RatePlan"("hotelId");
CREATE INDEX "RatePlan_roomTypeId_idx" ON "RatePlan"("roomTypeId");
CREATE INDEX "RatePlan_hotelId_roomTypeId_idx" ON "RatePlan"("hotelId", "roomTypeId");
CREATE UNIQUE INDEX "RatePlanPrice_ratePlanId_currency_key" ON "RatePlanPrice"("ratePlanId", "currency");
CREATE INDEX "RatePlanPrice_ratePlanId_idx" ON "RatePlanPrice"("ratePlanId");
CREATE INDEX "RatePlanRestriction_ratePlanId_idx" ON "RatePlanRestriction"("ratePlanId");

-- Clés étrangères
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_roomTypeId_fkey"
  FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatePlanPrice" ADD CONSTRAINT "RatePlanPrice_ratePlanId_fkey"
  FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatePlanRestriction" ADD CONSTRAINT "RatePlanRestriction_ratePlanId_fkey"
  FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
