-- ============================================================================
-- AfriHost AI — Module 14 : Cuisine (Kitchen Display System)
-- Migration : 20260804090000_kitchen
--
-- Ajoute :
--   * enums KitchenOrderStatus (NEW/PREPARING/READY/SERVED/MODIFIED/CANCELLED),
--     KitchenLineStatus ;
--   * KitchenStation    : poste de cuisine (grillard, froid, plats, desserts) ;
--   * KitchenOrder      : ordre de préparation intégré au POS restaurant ;
--   * KitchenOrderLine  : lignes de l'ordre ;
--   * KitchenOrderEvent : traçabilité / temps réel.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "KitchenOrderStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'SERVED', 'MODIFIED', 'CANCELLED');
CREATE TYPE "KitchenLineStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

CREATE TABLE "KitchenStation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenOrder" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "posOrderId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "kitchenRef" TEXT NOT NULL,
    "status" "KitchenOrderStatus" NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "posPointId" TEXT,
    "reservationId" TEXT,
    "roomId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitchenOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenOrderLine" (
    "id" TEXT NOT NULL,
    "kitchenOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "status" "KitchenLineStatus" NOT NULL DEFAULT 'NEW',
    CONSTRAINT "KitchenOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenOrderEvent" (
    "id" TEXT NOT NULL,
    "kitchenOrderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KitchenOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KitchenStation_hotelId_idx" ON "KitchenStation"("hotelId");
CREATE UNIQUE INDEX "KitchenOrder_kitchenRef_key" ON "KitchenOrder"("kitchenRef");
CREATE INDEX "KitchenOrder_hotelId_status_idx" ON "KitchenOrder"("hotelId", "status");
CREATE INDEX "KitchenOrder_stationId_status_idx" ON "KitchenOrder"("stationId", "status");
CREATE INDEX "KitchenOrder_posOrderId_idx" ON "KitchenOrder"("posOrderId");
CREATE INDEX "KitchenOrderLine_kitchenOrderId_idx" ON "KitchenOrderLine"("kitchenOrderId");
CREATE INDEX "KitchenOrderEvent_kitchenOrderId_idx" ON "KitchenOrderEvent"("kitchenOrderId");

ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenOrder" ADD CONSTRAINT "KitchenOrder_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenOrder" ADD CONSTRAINT "KitchenOrder_posOrderId_fkey"
  FOREIGN KEY ("posOrderId") REFERENCES "PosOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenOrder" ADD CONSTRAINT "KitchenOrder_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenOrderLine" ADD CONSTRAINT "KitchenOrderLine_kitchenOrderId_fkey"
  FOREIGN KEY ("kitchenOrderId") REFERENCES "KitchenOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenOrderEvent" ADD CONSTRAINT "KitchenOrderEvent_kitchenOrderId_fkey"
  FOREIGN KEY ("kitchenOrderId") REFERENCES "KitchenOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
