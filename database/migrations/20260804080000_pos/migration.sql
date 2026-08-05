-- ============================================================================
-- AfriHost AI — Module 13 : POS Restaurant
-- Migration : 20260804080000_pos
--
-- Ajoute :
--   * enums PosKind (RESTAURANT/BAR/ROOM_SERVICE), PosOrderStatus ;
--   * PosPoint      : point de vente (restaurant, bar, room service) ;
--   * PosMenu / PosMenuLine : menus et leurs lignes (produit + prix + taxe) ;
--   * PosOrder / PosOrderLine : commandes et lignes ;
--   * PosOrderEvent : traçabilité (remboursements, annulations, modifications) ;
--   * PosPayment    : paiements POS (divers moyens).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "PosKind" AS ENUM ('RESTAURANT', 'BAR', 'ROOM_SERVICE');
CREATE TYPE "PosOrderStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'REFUNDED', 'CANCELLED');

CREATE TABLE "PosPoint" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PosKind" NOT NULL DEFAULT 'RESTAURANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosMenu" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "posPointId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "PosMenu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosMenuLine" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "taxRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PosMenuLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosOrder" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "posPointId" TEXT NOT NULL,
    "reservationId" TEXT,
    "roomId" TEXT,
    "orderRef" TEXT NOT NULL,
    "status" "PosOrderStatus" NOT NULL DEFAULT 'OPEN',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "taxRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    CONSTRAINT "PosOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosOrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PosOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosPayment" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "reference" TEXT,
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PosPoint_hotelId_idx" ON "PosPoint"("hotelId");
CREATE INDEX "PosMenu_hotelId_idx" ON "PosMenu"("hotelId");
CREATE INDEX "PosMenuLine_menuId_idx" ON "PosMenuLine"("menuId");
CREATE UNIQUE INDEX "PosOrder_orderRef_key" ON "PosOrder"("orderRef");
CREATE INDEX "PosOrder_hotelId_status_idx" ON "PosOrder"("hotelId", "status");
CREATE INDEX "PosOrder_reservationId_idx" ON "PosOrder"("reservationId");
CREATE INDEX "PosOrder_posPointId_idx" ON "PosOrder"("posPointId");
CREATE INDEX "PosOrderLine_orderId_idx" ON "PosOrderLine"("orderId");
CREATE INDEX "PosOrderEvent_orderId_idx" ON "PosOrderEvent"("orderId");
CREATE INDEX "PosPayment_orderId_idx" ON "PosPayment"("orderId");

ALTER TABLE "PosPoint" ADD CONSTRAINT "PosPoint_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMenu" ADD CONSTRAINT "PosMenu_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMenu" ADD CONSTRAINT "PosMenu_posPointId_fkey"
  FOREIGN KEY ("posPointId") REFERENCES "PosPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMenuLine" ADD CONSTRAINT "PosMenuLine_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "PosMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosMenuLine" ADD CONSTRAINT "PosMenuLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_posPointId_fkey"
  FOREIGN KEY ("posPointId") REFERENCES "PosPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosOrderLine" ADD CONSTRAINT "PosOrderLine_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosOrderLine" ADD CONSTRAINT "PosOrderLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOrderEvent" ADD CONSTRAINT "PosOrderEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
