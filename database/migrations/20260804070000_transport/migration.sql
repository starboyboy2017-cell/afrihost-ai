-- ============================================================================
-- AfriHost AI — Module 12 : Transport, navettes & transferts
-- Migration : 20260804070000_transport
--
-- Ajoute :
--   * enums VehicleOwnership (INTERNAL/EXTERNAL), VehicleStatus, TransferStatus,
--     TransferType ;
--   * Vehicle              : véhicule (capacité, plaque, état, disponibilité) ;
--   * Driver               : chauffeur (affectation, disponibilité, planning) ;
--   * Transfer             : réservation de transfert (trajet, statut, facturation) ;
--   * TransferAssignment   : affectation véhicule + chauffeur.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "VehicleOwnership" AS ENUM ('INTERNAL', 'EXTERNAL');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE');
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TransferType" AS ENUM ('AIRPORT', 'STATION', 'CITY', 'CUSTOM', 'ROUND_TRIP', 'MULTI_STOP');

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "ownership" "VehicleOwnership" NOT NULL DEFAULT 'INTERNAL',
    "providerName" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT,
    "reservationId" TEXT,
    "transferRef" TEXT NOT NULL,
    "type" "TransferType" NOT NULL DEFAULT 'AIRPORT',
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "paxCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT DEFAULT 'XOF',
    "invoicedToReservation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransferAssignment" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "TransferAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");
CREATE INDEX "Vehicle_hotelId_status_idx" ON "Vehicle"("hotelId", "status");
CREATE INDEX "Driver_hotelId_idx" ON "Driver"("hotelId");
CREATE UNIQUE INDEX "Transfer_transferRef_key" ON "Transfer"("transferRef");
CREATE INDEX "Transfer_hotelId_status_idx" ON "Transfer"("hotelId", "status");
CREATE INDEX "Transfer_scheduledAt_idx" ON "Transfer"("scheduledAt");
CREATE INDEX "Transfer_reservationId_idx" ON "Transfer"("reservationId");
CREATE INDEX "TransferAssignment_transferId_idx" ON "TransferAssignment"("transferId");
CREATE INDEX "TransferAssignment_vehicleId_idx" ON "TransferAssignment"("vehicleId");
CREATE INDEX "TransferAssignment_driverId_idx" ON "TransferAssignment"("driverId");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransferAssignment" ADD CONSTRAINT "TransferAssignment_transferId_fkey"
  FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransferAssignment" ADD CONSTRAINT "TransferAssignment_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferAssignment" ADD CONSTRAINT "TransferAssignment_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
