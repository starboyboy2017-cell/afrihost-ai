-- ============================================================================
-- AfriHost AI — Module 32 : Billing SaaS & Abonnements (Super Administration)
-- Migration : 20260804270000_saas
--
-- Cycle de vie des abonnements, plans, facturation, paiements automatiques
-- (provider-agnostic) et manuels. Réservé au Super Admin.
-- Ajoute :
--   * SaasPlan, SaasSubscription, SaasInvoice, SaasPayment,
--     SaasManualPayment, SaasPaymentMethod, SaasCoupon.
--
-- Ces entités sont globales (cross-hôtel). L'accès est réservé au Super Admin
-- via RLS (scope SAAS) — jamais au portail hôtels/clients.
-- ============================================================================

-- Plan d'abonnement
CREATE TABLE "SaasPlan" (
    "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY', "trialDays" INTEGER NOT NULL DEFAULT 0,
    "maxUsers" INTEGER NOT NULL DEFAULT 1, "maxHotels" INTEGER NOT NULL DEFAULT 1, "maxRooms" INTEGER NOT NULL DEFAULT 0,
    "quotaAi" INTEGER NOT NULL DEFAULT 0, "quotaEmail" INTEGER NOT NULL DEFAULT 0,
    "quotaSms" INTEGER NOT NULL DEFAULT 0, "quotaWhatsapp" INTEGER NOT NULL DEFAULT 0, "quotaApi" INTEGER NOT NULL DEFAULT 0,
    "modules" TEXT[], "features" JSONB, "allowedPaymentMethods" TEXT[], "allowedCountries" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaasPlan_code_key" UNIQUE ("code")
);

-- Abonnement
CREATE TABLE "SaasSubscription" (
    "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "hotelId" TEXT, "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL', "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL, "currentPeriodEnd" TIMESTAMP(3) NOT NULL, "renewsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3), "price" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasSubscription_pkey" PRIMARY KEY ("id")
);

-- Facture d'abonnement
CREATE TABLE "SaasInvoice" (
    "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "hotelId" TEXT, "subscriptionId" TEXT NOT NULL,
    "number" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL DEFAULT 0, "taxAmount" INTEGER NOT NULL DEFAULT 0, "total" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF', "vatRate" DECIMAL NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dueAt" TIMESTAMP(3), "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasInvoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaasInvoice_number_key" UNIQUE ("number")
);

-- Paiement automatique
CREATE TABLE "SaasPayment" (
    "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "hotelId" TEXT, "invoiceId" TEXT, "subscriptionId" TEXT,
    "providerKey" TEXT NOT NULL, "amount" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'PENDING', "providerRef" TEXT, "error" TEXT, "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasPayment_pkey" PRIMARY KEY ("id")
);

-- Paiement manuel
CREATE TABLE "SaasManualPayment" (
    "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "hotelId" TEXT, "subscriptionId" TEXT NOT NULL, "invoiceId" TEXT,
    "methodKey" TEXT NOT NULL, "amount" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "proofType" TEXT, "proofUrl" TEXT, "bankRef" TEXT, "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewComment" TEXT, "reviewedBy" TEXT, "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasManualPayment_pkey" PRIMARY KEY ("id")
);

-- Moyen de paiement configurable
CREATE TABLE "SaasPaymentMethod" (
    "id" TEXT NOT NULL, "methodKey" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'AUTO',
    "isActive" BOOLEAN NOT NULL DEFAULT true, "countries" TEXT[], "currencies" TEXT[], "plans" TEXT[], "hotelIds" TEXT[],
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasPaymentMethod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaasPaymentMethod_methodKey_key" UNIQUE ("methodKey")
);

-- Coupon
CREATE TABLE "SaasCoupon" (
    "id" TEXT NOT NULL, "code" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'PERCENT', "value" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER, "used" INTEGER NOT NULL DEFAULT 0, "planCodes" TEXT[], "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaasCoupon_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaasCoupon_code_key" UNIQUE ("code")
);

-- Index
CREATE INDEX "SaasSubscription_organisationId_status_idx" ON "SaasSubscription"("organisationId", "status");
CREATE INDEX "SaasSubscription_planId_idx" ON "SaasSubscription"("planId");
CREATE INDEX "SaasInvoice_organisationId_status_idx" ON "SaasInvoice"("organisationId", "status");
CREATE INDEX "SaasInvoice_subscriptionId_idx" ON "SaasInvoice"("subscriptionId");
CREATE INDEX "SaasPayment_organisationId_status_idx" ON "SaasPayment"("organisationId", "status");
CREATE INDEX "SaasPayment_invoiceId_idx" ON "SaasPayment"("invoiceId");
CREATE INDEX "SaasManualPayment_organisationId_status_idx" ON "SaasManualPayment"("organisationId", "status");
CREATE INDEX "SaasManualPayment_subscriptionId_idx" ON "SaasManualPayment"("subscriptionId");
CREATE INDEX "SaasPlan_isActive_idx" ON "SaasPlan"("isActive");
CREATE INDEX "SaasCoupon_code_isActive_idx" ON "SaasCoupon"("code", "isActive");

-- Clés étrangères
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaasPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaasInvoice" ADD CONSTRAINT "SaasInvoice_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaasInvoice" ADD CONSTRAINT "SaasInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaasSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaasInvoice" ADD CONSTRAINT "SaasInvoice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaasManualPayment" ADD CONSTRAINT "SaasManualPayment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaasManualPayment" ADD CONSTRAINT "SaasManualPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaasSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
