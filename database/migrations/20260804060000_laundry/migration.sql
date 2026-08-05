-- ============================================================================
-- AfriHost AI — Module 11 : Blanchisserie
-- Migration : 20260804060000_laundry
--
-- Ajoute :
--   * enum LaundryState (CLEAN/DISTRIBUTED/USED/DIRTY/WASHING/DRYING/IRONING) ;
--   * LaundryItemType : types de linge par hôtel ;
--   * LaundryItem     : pièce de linge physique (état, chambre, code) ;
--   * LaundryBatch    : lot de lavage (dates, responsable, coût, mode interne/externe) ;
--   * LaundryBatchItem: pièces incluses dans un lot ;
--   * LaundryLoss     : pertes / détériorations.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "LaundryState" AS ENUM ('CLEAN', 'DISTRIBUTED', 'USED', 'DIRTY', 'WASHING', 'DRYING', 'IRONING');

CREATE TABLE "LaundryItemType" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "LaundryItemType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaundryItem" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "code" TEXT,
    "state" "LaundryState" NOT NULL DEFAULT 'CLEAN',
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "LaundryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaundryBatch" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "providerName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "responsible" TEXT,
    "cost" INTEGER,
    "currency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LaundryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaundryBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaundryBatchItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaundryLoss" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "costValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaundryLoss_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LaundryItemType_hotelId_idx" ON "LaundryItemType"("hotelId");
CREATE INDEX "LaundryItem_hotelId_state_idx" ON "LaundryItem"("hotelId", "state");
CREATE INDEX "LaundryItem_itemTypeId_idx" ON "LaundryItem"("itemTypeId");
CREATE INDEX "LaundryItem_roomId_idx" ON "LaundryItem"("roomId");
CREATE INDEX "LaundryBatch_hotelId_startedAt_idx" ON "LaundryBatch"("hotelId", "startedAt");
CREATE INDEX "LaundryBatchItem_batchId_idx" ON "LaundryBatchItem"("batchId");
CREATE INDEX "LaundryLoss_hotelId_createdAt_idx" ON "LaundryLoss"("hotelId", "createdAt");

ALTER TABLE "LaundryItemType" ADD CONSTRAINT "LaundryItemType_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaundryItem" ADD CONSTRAINT "LaundryItem_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaundryItem" ADD CONSTRAINT "LaundryItem_itemTypeId_fkey"
  FOREIGN KEY ("itemTypeId") REFERENCES "LaundryItemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaundryItem" ADD CONSTRAINT "LaundryItem_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LaundryBatch" ADD CONSTRAINT "LaundryBatch_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaundryBatchItem" ADD CONSTRAINT "LaundryBatchItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "LaundryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LaundryBatchItem" ADD CONSTRAINT "LaundryBatchItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "LaundryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaundryLoss" ADD CONSTRAINT "LaundryLoss_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaundryLoss" ADD CONSTRAINT "LaundryLoss_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "LaundryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
