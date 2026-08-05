-- ============================================================================
-- AfriHost AI — Module 21 : CRM
-- Migration : 20260804160000_crm
--
-- Ajoute :
--   * enums CampaignChannel, CampaignStatus ;
--   * tables : Company, GuestPreference, CustomerSegment, Campaign, CampaignSend,
--     CustomerInteraction, CustomerTask, Opportunity ;
--   * colonne Guest.companyId.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'OTHER');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'PARTIALLY_SENT', 'CANCELLED');

CREATE TABLE "Company" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL,
    "contact" TEXT, "email" TEXT, "phone" TEXT, "address" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GuestPreference" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL, "language" TEXT,
    "roomTypeId" TEXT, "floor" TEXT, "view" TEXT, "bedType" TEXT, "diet" TEXT, "allergies" TEXT[],
    "favoritePaymentMethod" TEXT, "birthDate" TIMESTAMP(3), "communicationPrefs" JSONB, "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestPreference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerSegment" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
    "criteria" JSONB, "isDynamic" BOOLEAN NOT NULL DEFAULT true, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "segmentId" TEXT, "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL, "subject" TEXT, "messageTemplate" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignSend" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "openedAt" TIMESTAMP(3), "clickedAt" TIMESTAMP(3),
    CONSTRAINT "CampaignSend_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerInteraction" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL, "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL, "detail" JSONB, "sourceModule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerTask" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL, "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL, "body" TEXT, "dueAt" TIMESTAMP(3), "done" BOOLEAN NOT NULL DEFAULT false,
    "assignedTo" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT, "companyId" TEXT, "title" TEXT NOT NULL,
    "value" INTEGER, "stage" TEXT NOT NULL, "expectedDate" TIMESTAMP(3), "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Guest" ADD COLUMN "companyId" TEXT;

CREATE INDEX "Company_hotelId_idx" ON "Company"("hotelId");
CREATE INDEX "GuestPreference_guestId_idx" ON "GuestPreference"("guestId");
CREATE INDEX "CustomerSegment_hotelId_idx" ON "CustomerSegment"("hotelId");
CREATE INDEX "Campaign_hotelId_status_idx" ON "Campaign"("hotelId", "status");
CREATE INDEX "CampaignSend_campaignId_idx" ON "CampaignSend"("campaignId");
CREATE INDEX "CustomerInteraction_guestId_createdAt_idx" ON "CustomerInteraction"("guestId", "createdAt");
CREATE INDEX "CustomerInteraction_hotelId_createdAt_idx" ON "CustomerInteraction"("hotelId", "createdAt");
CREATE INDEX "CustomerTask_guestId_idx" ON "CustomerTask"("guestId");
CREATE INDEX "Opportunity_hotelId_idx" ON "Opportunity"("hotelId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuestPreference" ADD CONSTRAINT "GP_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuestPreference" ADD CONSTRAINT "GP_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSegment" ADD CONSTRAINT "CS_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CI_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CI_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTask" ADD CONSTRAINT "CT_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerTask" ADD CONSTRAINT "CT_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Op_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Op_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Op_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
