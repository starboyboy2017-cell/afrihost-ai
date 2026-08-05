-- ============================================================================
-- AfriHost AI — Module 7 : Check-in / Check-out (séjours physiques)
-- Migration : 20260804030000_stay_checkin_checkout
--
-- Ajoute :
--   * Stay            : séjour physique (check-in/out, statut, date de départ) ;
--   * RoomAssignment  : historique des changements de chambre ;
--   * enum StayStatus : ACTIVE / CHECKED_OUT.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Enum
CREATE TYPE "StayStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- Table Stay
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "guestId" TEXT,
    "roomId" TEXT,
    "status" "StayStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- Table RoomAssignment (historique des changements de chambre)
CREATE TABLE "RoomAssignment" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toDate" TIMESTAMP(3),
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomAssignment_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE UNIQUE INDEX "Stay_reservationId_key" ON "Stay"("reservationId");
CREATE INDEX "Stay_hotelId_status_idx" ON "Stay"("hotelId", "status");
CREATE INDEX "Stay_roomId_status_idx" ON "Stay"("roomId", "status");
CREATE INDEX "RoomAssignment_stayId_idx" ON "RoomAssignment"("stayId");

-- Clés étrangères
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoomAssignment" ADD CONSTRAINT "RoomAssignment_stayId_fkey"
  FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomAssignment" ADD CONSTRAINT "RoomAssignment_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
