-- ============================================================================
-- AfriHost AI — Module 15 : Caisse
-- Migration : 20260804100000_cash
--
-- Ajoute :
--   * enums CashSessionStatus (OPEN/CLOSED), CashMovementType ;
--   * CashRegister  : caisse (tiroir) d'un hôtel, plusieurs caisses possibles ;
--   * CashSession   : ouverture/fermeture, clôture + réconciliation ;
--   * CashMovement  : mouvements de caisse (multi-moyens, remboursements, ...).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashMovementType" AS ENUM ('OPENING', 'SALE', 'PAYMENT', 'REFUND', 'VOID', 'EXPENSE', 'CLOSING', 'RECONCILIATION');

CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "posPointId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "cashierId" TEXT,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingAmount" INTEGER NOT NULL DEFAULT 0,
    "closingAmount" INTEGER,
    "countedAmount" INTEGER,
    "difference" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashRegister_hotelId_idx" ON "CashRegister"("hotelId");
CREATE INDEX "CashSession_hotelId_status_idx" ON "CashSession"("hotelId", "status");
CREATE INDEX "CashSession_registerId_idx" ON "CashSession"("registerId");
CREATE INDEX "CashMovement_sessionId_idx" ON "CashMovement"("sessionId");
CREATE INDEX "CashMovement_hotelId_createdAt_idx" ON "CashMovement"("hotelId", "createdAt");

ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_posPointId_fkey"
  FOREIGN KEY ("posPointId") REFERENCES "PosPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_registerId_fkey"
  FOREIGN KEY ("registerId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "CashSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
