-- ============================================================================
-- AfriHost AI — Module 22 : Programme de fidélité
-- Migration : 20260804170000_loyalty
--
-- Ajoute :
--   * enums LoyaltyBonusType, LoyaltyRewardType, LoyaltyNotificationType ;
--   * tables : LoyaltyProgram, LoyaltyProgramHotel (groupe d'hôtels),
--     LoyaltyTier, LoyaltyRule (moteur paramétrable), LoyaltyReward,
--     LoyaltyBonus, LoyaltyMember, LoyaltyRedemption, LoyaltyNotification ;
--   * colonnes complémentaires sur LoyaltyTransaction (programme, règle,
--     récompense, solde après, description, module source).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS). Aucune logique
-- métier n'est codée en dur : l'attribution est pilotée par LoyaltyRule.
-- ============================================================================

CREATE TYPE "LoyaltyBonusType" AS ENUM ('WELCOME', 'BIRTHDAY', 'REFERRAL', 'CAMPAIGN', 'OTHER');
CREATE TYPE "LoyaltyRewardType" AS ENUM ('DISCOUNT', 'FREE_NIGHT', 'UPGRADE', 'SERVICE', 'VOUCHER');
CREATE TYPE "LoyaltyNotificationType" AS ENUM ('POINTS_EARNED', 'POINTS_EXPIRING', 'TIER_UPGRADED', 'TIER_DOWNGRADED', 'REWARD_AVAILABLE', 'REDEMPTION_CONFIRMED', 'WELCOME', 'CAMPAIGN');

-- Programme de fidélité (par hôtel ou groupe d'hôtels)
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL, "scope" TEXT NOT NULL DEFAULT 'HOTEL', "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "pointsPerSpend" DECIMAL NOT NULL DEFAULT 0, "pointsPerNight" INTEGER NOT NULL DEFAULT 0,
    "validityDays" INTEGER NOT NULL DEFAULT 365, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3), "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- Association d'un programme à un hôtel (support groupe d'hôtels)
CREATE TABLE "LoyaltyProgramHotel" (
    "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyProgramHotel_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LoyaltyProgramHotel_programId_hotelId_key" UNIQUE ("programId", "hotelId")
);

-- Niveau de fidélité
CREATE TABLE "LoyaltyTier" (
    "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "code" TEXT NOT NULL, "name" TEXT NOT NULL, "rank" INTEGER NOT NULL DEFAULT 0,
    "minPoints" INTEGER NOT NULL DEFAULT 0, "minStays" INTEGER NOT NULL DEFAULT 0,
    "minSpend" DECIMAL NOT NULL DEFAULT 0, "benefits" JSONB, "accessRules" JSONB, "keepRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LoyaltyTier_programId_code_key" UNIQUE ("programId", "code")
);

-- Moteur de règles : attribution paramétrable des points
CREATE TABLE "LoyaltyRule" (
    "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL, "trigger" TEXT NOT NULL, "condition" JSONB,
    "points" INTEGER NOT NULL DEFAULT 0, "pointsPerUnit" DECIMAL NOT NULL DEFAULT 0,
    "multiplier" DECIMAL NOT NULL DEFAULT 1, "capPerEvent" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 100, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyRule_pkey" PRIMARY KEY ("id")
);

-- Récompense échangeable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL, "type" "LoyaltyRewardType" NOT NULL,
    "pointsCost" INTEGER NOT NULL DEFAULT 0, "value" DECIMAL NOT NULL DEFAULT 0, "description" TEXT,
    "config" JSONB, "validityDays" INTEGER NOT NULL DEFAULT 365, "stock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- Bonus (bienvenue, anniversaire, parrainage, campagne)
CREATE TABLE "LoyaltyBonus" (
    "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL, "bonusType" "LoyaltyBonusType" NOT NULL, "points" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyBonus_pkey" PRIMARY KEY ("id")
);

-- Adhésion d'un client
CREATE TABLE "LoyaltyMember" (
    "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "tierId" TEXT, "pointsBalance" INTEGER NOT NULL DEFAULT 0, "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastEarnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LoyaltyMember_programId_guestId_key" UNIQUE ("programId", "guestId")
);

-- Échange de points contre une récompense
CREATE TABLE "LoyaltyRedemption" (
    "id" TEXT NOT NULL, "memberId" TEXT NOT NULL, "rewardId" TEXT NOT NULL,
    "programId" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT, "metadata" JSONB,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "LoyaltyRedemption_pkey" PRIMARY KEY ("id")
);

-- Notification fidélité
CREATE TABLE "LoyaltyNotification" (
    "id" TEXT NOT NULL, "memberId" TEXT NOT NULL, "guestId" TEXT NOT NULL, "hotelId" TEXT NOT NULL,
    "type" "LoyaltyNotificationType" NOT NULL, "title" TEXT NOT NULL, "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyNotification_pkey" PRIMARY KEY ("id")
);

-- Enrichissement de LoyaltyTransaction (Module 22)
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "memberId" TEXT;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "programId" TEXT;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "ruleId" TEXT;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "rewardId" TEXT;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "balanceAfter" INTEGER;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "description" TEXT;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "sourceModule" TEXT;

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------
CREATE INDEX "LoyaltyProgram_hotelId_idx" ON "LoyaltyProgram"("hotelId");
CREATE INDEX "LoyaltyProgram_organisationId_idx" ON "LoyaltyProgram"("organisationId");
CREATE INDEX "LoyaltyProgramHotel_hotelId_idx" ON "LoyaltyProgramHotel"("hotelId");
CREATE INDEX "LoyaltyTier_hotelId_idx" ON "LoyaltyTier"("hotelId");
CREATE INDEX "LoyaltyRule_programId_trigger_idx" ON "LoyaltyRule"("programId", "trigger");
CREATE INDEX "LoyaltyRule_hotelId_idx" ON "LoyaltyRule"("hotelId");
CREATE INDEX "LoyaltyReward_hotelId_idx" ON "LoyaltyReward"("hotelId");
CREATE INDEX "LoyaltyBonus_hotelId_idx" ON "LoyaltyBonus"("hotelId");
CREATE INDEX "LoyaltyMember_hotelId_idx" ON "LoyaltyMember"("hotelId");
CREATE INDEX "LoyaltyMember_guestId_idx" ON "LoyaltyMember"("guestId");
CREATE INDEX "LoyaltyRedemption_memberId_idx" ON "LoyaltyRedemption"("memberId");
CREATE INDEX "LoyaltyRedemption_hotelId_idx" ON "LoyaltyRedemption"("hotelId");
CREATE INDEX "LoyaltyNotification_memberId_read_idx" ON "LoyaltyNotification"("memberId", "read");
CREATE INDEX "LoyaltyNotification_hotelId_idx" ON "LoyaltyNotification"("hotelId");
CREATE INDEX "LoyaltyTransaction_memberId_createdAt_idx" ON "LoyaltyTransaction"("memberId", "createdAt");
CREATE INDEX "LoyaltyTransaction_hotelId_createdAt_idx" ON "LoyaltyTransaction"("hotelId", "createdAt");

-- ---------------------------------------------------------------------------
-- Clés étrangères
-- ---------------------------------------------------------------------------
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyProgramHotel" ADD CONSTRAINT "LoyaltyProgramHotel_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyProgramHotel" ADD CONSTRAINT "LoyaltyProgramHotel_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyBonus" ADD CONSTRAINT "LoyaltyBonus_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyBonus" ADD CONSTRAINT "LoyaltyBonus_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyMember" ADD CONSTRAINT "LoyaltyMember_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyMember" ADD CONSTRAINT "LoyaltyMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyMember" ADD CONSTRAINT "LoyaltyMember_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyMember" ADD CONSTRAINT "LoyaltyMember_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LoyaltyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoyaltyNotification" ADD CONSTRAINT "LoyaltyNotification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LoyaltyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyNotification" ADD CONSTRAINT "LoyaltyNotification_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyNotification" ADD CONSTRAINT "LoyaltyNotification_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LoyaltyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "LoyaltyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
