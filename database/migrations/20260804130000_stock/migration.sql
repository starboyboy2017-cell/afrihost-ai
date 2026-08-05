-- ============================================================================
-- AfriHost AI — Module 18 : Stock & inventaire
-- Migration : 20260804130000_stock
--
-- Ajoute :
--   * enums StockMovementType, PurchaseOrderStatus, StockCountStatus ;
--   * tables : StockCategory, Supplier, UnitOfMeasure, Warehouse, PurchaseOrder,
--     PurchaseOrderLine, StockReceipt, StockReceiptLine, StockMovement, StockCount,
--     StockCountLine ;
--   * colonnes sur StockItem (warehouseId, minLevel, maxLevel, unitCost) ;
--   * colonnes sur Product (categoryId, unitId).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'LOSS', 'BREAKAGE', 'PRODUCTION');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED');

-- Catégories
CREATE TABLE "StockCategory" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockCategory_pkey" PRIMARY KEY ("id")
);
-- Fournisseurs
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "contact" TEXT, "phone" TEXT, "email" TEXT, "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
-- Unités de mesure
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "abbreviation" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);
-- Entrepôts
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "location" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
-- Commandes fournisseurs
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "supplierId" TEXT NOT NULL, "poRef" TEXT NOT NULL, "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3), "expectedDate" TIMESTAMP(3), "receivedAt" TIMESTAMP(3), "createdBy" TEXT, "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF', "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
-- Lignes de commande
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL, "purchaseOrderId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" INTEGER NOT NULL, "amount" INTEGER NOT NULL, "receivedQty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);
-- Réceptions
CREATE TABLE "StockReceipt" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "purchaseOrderId" TEXT, "supplierId" TEXT, "receiptRef" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "receivedBy" TEXT, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockReceipt_pkey" PRIMARY KEY ("id")
);
-- Lignes de réception
CREATE TABLE "StockReceiptLine" (
    "id" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" INTEGER NOT NULL, "warehouseId" TEXT,
    CONSTRAINT "StockReceiptLine_pkey" PRIMARY KEY ("id")
);
-- Mouvements de stock
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "productId" TEXT NOT NULL, "warehouseId" TEXT, "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL, "unitCost" INTEGER, "reference" TEXT, "note" TEXT, "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
-- Inventaires
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "warehouseId" TEXT, "countRef" TEXT NOT NULL, "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
    "countedBy" TEXT, "countedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);
-- Lignes d'inventaire
CREATE TABLE "StockCountLine" (
    "id" TEXT NOT NULL, "stockCountId" TEXT NOT NULL, "productId" TEXT NOT NULL, "theoreticalQty" DECIMAL(14,3) NOT NULL,
    "countedQty" DECIMAL(14,3) NOT NULL, "difference" DECIMAL(14,3) NOT NULL, "adjusted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id")
);

-- Colonnes sur StockItem
ALTER TABLE "StockItem" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "StockItem" ADD COLUMN "minLevel" DECIMAL(14,3);
ALTER TABLE "StockItem" ADD COLUMN "maxLevel" DECIMAL(14,3);
ALTER TABLE "StockItem" ADD COLUMN "unitCost" INTEGER;
DROP INDEX IF EXISTS "StockItem_productId_location_key";
CREATE UNIQUE INDEX "StockItem_productId_warehouseId_location_key" ON "StockItem"("productId", "warehouseId", "location");

-- Colonnes sur Product
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Product" ADD COLUMN "unitId" TEXT;

-- Index
CREATE INDEX "StockCategory_hotelId_idx" ON "StockCategory"("hotelId");
CREATE INDEX "Supplier_hotelId_idx" ON "Supplier"("hotelId");
CREATE INDEX "UnitOfMeasure_hotelId_idx" ON "UnitOfMeasure"("hotelId");
CREATE INDEX "Warehouse_hotelId_idx" ON "Warehouse"("hotelId");
CREATE UNIQUE INDEX "PurchaseOrder_poRef_key" ON "PurchaseOrder"("poRef");
CREATE INDEX "PurchaseOrder_hotelId_status_idx" ON "PurchaseOrder"("hotelId", "status");
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");
CREATE UNIQUE INDEX "StockReceipt_receiptRef_key" ON "StockReceipt"("receiptRef");
CREATE INDEX "StockReceipt_hotelId_idx" ON "StockReceipt"("hotelId");
CREATE INDEX "StockReceiptLine_receiptId_idx" ON "StockReceiptLine"("receiptId");
CREATE INDEX "StockMovement_hotelId_createdAt_idx" ON "StockMovement"("hotelId", "createdAt");
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE UNIQUE INDEX "StockCount_countRef_key" ON "StockCount"("countRef");
CREATE INDEX "StockCount_hotelId_status_idx" ON "StockCount"("hotelId", "status");
CREATE INDEX "StockCountLine_stockCountId_idx" ON "StockCountLine"("stockCountId");

-- Clés étrangères
ALTER TABLE "StockCategory" ADD CONSTRAINT "StockCategory_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "POL_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "POL_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReceipt" ADD CONSTRAINT "StockReceipt_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReceipt" ADD CONSTRAINT "StockReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockReceipt" ADD CONSTRAINT "StockReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockReceiptLine" ADD CONSTRAINT "SRL_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "StockReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockReceiptLine" ADD CONSTRAINT "SRL_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReceiptLine" ADD CONSTRAINT "SRL_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockCountLine" ADD CONSTRAINT "SCL_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockCountLine" ADD CONSTRAINT "SCL_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StockCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
