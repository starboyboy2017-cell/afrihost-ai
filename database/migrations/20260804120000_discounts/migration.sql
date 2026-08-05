-- ============================================================================
-- AfriHost AI — Module 17 : Remises, promotions & coupons
-- Migration : 20260804120000_discounts
--
-- Ajoute :
--   * enums DiscountType (PERCENT/FIXED), DiscountScope (POS/RESERVATION/BILLING),
--     CouponStatus (ACTIVE/USED/EXPIRED/REVOKED) ;
--   * DiscountRule : règle de remise flexible (type, valeur, portée, plafond par
--     rôle, conditions JSON : dates/canaux/types de clients/types de chambres/montants) ;
--   * Coupon        : génération et validation des coupons.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "DiscountScope" AS ENUM ('POS', 'RESERVATION', 'BILLING');
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "scope" "DiscountScope" NOT NULL DEFAULT 'POS',
    "roleCap" INTEGER,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "singleUse" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "issuedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiscountRule_hotelId_isActive_idx" ON "DiscountRule"("hotelId", "isActive");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_hotelId_status_idx" ON "Coupon"("hotelId", "status");
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "DiscountRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
