-- ============================================================================
-- AfriHost AI — Module 16 : Gestion des pourboires
-- Migration : 20260804110000_tips
--
-- Ajoute :
--   * enums TipType (INDIVIDUAL/COLLECTIVE), TipStatus ;
--   * TipRule        : règle de répartition configurable PAR HÔTEL (% serveur/équipe/cuisine) ;
--   * Tip            : pourboire enregistré lors d'un paiement POS (individuel/collectif) ;
--   * TipAllocation  : répartition vers les bénéficiaires ;
--   * TipEvent       : historique / traçabilité (validation, distribution, annulation).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "TipType" AS ENUM ('INDIVIDUAL', 'COLLECTIVE');
CREATE TYPE "TipStatus" AS ENUM ('PENDING', 'VALIDATED', 'DISTRIBUTED', 'CANCELLED');

CREATE TABLE "TipRule" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "serverPercent" INTEGER NOT NULL DEFAULT 60,
    "teamPercent" INTEGER NOT NULL DEFAULT 30,
    "kitchenPercent" INTEGER NOT NULL DEFAULT 10,
    "otherPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TipRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "posPaymentId" TEXT,
    "posOrderId" TEXT,
    "type" "TipType" NOT NULL,
    "status" "TipStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "tipRuleId" TEXT,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "distributedAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipAllocation" (
    "id" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipEvent" (
    "id" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TipRule_hotelId_idx" ON "TipRule"("hotelId");
CREATE INDEX "Tip_hotelId_status_idx" ON "Tip"("hotelId", "status");
CREATE INDEX "Tip_posPaymentId_idx" ON "Tip"("posPaymentId");
CREATE INDEX "TipAllocation_tipId_idx" ON "TipAllocation"("tipId");
CREATE INDEX "TipEvent_tipId_idx" ON "TipEvent"("tipId");

ALTER TABLE "TipRule" ADD CONSTRAINT "TipRule_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_posPaymentId_fkey"
  FOREIGN KEY ("posPaymentId") REFERENCES "PosPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_posOrderId_fkey"
  FOREIGN KEY ("posOrderId") REFERENCES "PosOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_tipRuleId_fkey"
  FOREIGN KEY ("tipRuleId") REFERENCES "TipRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_tipId_fkey"
  FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipEvent" ADD CONSTRAINT "TipEvent_tipId_fkey"
  FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
