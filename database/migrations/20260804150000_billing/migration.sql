-- ============================================================================
-- AfriHost AI — Module 20 : Paiements & facturation (folios clients)
-- Migration : 20260804150000_billing
--
-- Ajoute :
--   * enums FolioChargeType, FolioStatus ;
--   * Folio / FolioLine : folio client centralisant tous les frais ;
--   * PaymentGateway   : passerelles de paiement configurables (Stripe, Flutterwave,
--     Paystack, Mobile Money...) ;
--   * enrichit Payment  : folioId, kind (PARTIAL/DEPOSIT/CAUTION/FULL/DEFERRED),
--     gatewayId, gatewayRef ;
--   * enrichit Invoice  : folioId.
--
-- NB : les tables Payment et Invoice existent déjà ; cette migration les ALTÈRE.
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "FolioChargeType" AS ENUM ('ROOM', 'RESTAURANT', 'ROOM_SERVICE', 'LAUNDRY', 'TRANSPORT', 'MAINTENANCE', 'MINIBAR', 'OTHER');
CREATE TYPE "FolioStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "Folio" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "reservationId" TEXT, "guestId" TEXT NOT NULL,
    "folioRef" TEXT NOT NULL, "name" TEXT, "status" "FolioStatus" NOT NULL DEFAULT 'OPEN',
    "groupRef" TEXT, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FolioLine" (
    "id" TEXT NOT NULL, "folioId" TEXT NOT NULL, "chargeType" "FolioChargeType" NOT NULL,
    "description" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1, "unitPrice" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL, "taxRate" DECIMAL(10,4) NOT NULL DEFAULT 0, "sourceRef" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "voided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FolioLine_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentGateway" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "provider" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);

-- Enrichir Payment
ALTER TABLE "Payment" ADD COLUMN "folioId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "kind" TEXT;
ALTER TABLE "Payment" ADD COLUMN "gatewayId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "gatewayRef" TEXT;

-- Enrichir Invoice
ALTER TABLE "Invoice" ADD COLUMN "folioId" TEXT;

CREATE UNIQUE INDEX "Folio_folioRef_key" ON "Folio"("folioRef");
CREATE INDEX "Folio_hotelId_status_idx" ON "Folio"("hotelId", "status");
CREATE INDEX "Folio_guestId_idx" ON "Folio"("guestId");
CREATE INDEX "Folio_groupRef_idx" ON "Folio"("groupRef");
CREATE INDEX "FolioLine_folioId_idx" ON "FolioLine"("folioId");
CREATE INDEX "PaymentGateway_hotelId_idx" ON "PaymentGateway"("hotelId");
CREATE INDEX "Payment_folioId_idx" ON "Payment"("folioId");

ALTER TABLE "Folio" ADD CONSTRAINT "Folio_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FolioLine" ADD CONSTRAINT "FolioLine_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentGateway" ADD CONSTRAINT "PG_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "PaymentGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
