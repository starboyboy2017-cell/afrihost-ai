-- ============================================================================
-- AfriHost AI — Module 19 : Comptabilité générale
-- Migration : 20260804140000_accounting
--
-- Ajoute :
--   * enums AccountNature, AccountType, AccountingJournalType, JournalEntryStatus ;
--   * tables : AccountingPeriod, Account (plan comptable configurable),
--     CostCenter, AccountingJournal, JournalEntry, JournalEntryLine,
--     AccountBalance, BankReconciliation.
--
-- Le plan comptable (SYSCOHADA révisé / OHADA / UEMOA) est chargé par configuration
-- via un seed séparé (voir database/seed/19-*), compatible multi-juridictions.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

CREATE TYPE "AccountNature" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OTHER');
CREATE TYPE "AccountingJournalType" AS ENUM ('SALES', 'PURCHASES', 'BANK', 'CASH', 'GENERAL');
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "label" TEXT NOT NULL, "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL, "isClosed" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Account" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL, "nature" "AccountNature" NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AccountingJournal" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" "AccountingJournalType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingJournal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "journalId" TEXT NOT NULL, "periodId" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL, "reference" TEXT NOT NULL, "label" TEXT NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT', "postedAt" TIMESTAMP(3), "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL, "entryId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "costCenterId" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0, "credit" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AccountBalance" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "periodId" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0, "credit" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "bankAccount" TEXT NOT NULL, "statementDate" TIMESTAMP(3) NOT NULL,
    "ledgerBalance" INTEGER NOT NULL, "bankBalance" INTEGER NOT NULL, "difference" INTEGER NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountingPeriod_hotelId_idx" ON "AccountingPeriod"("hotelId");
CREATE INDEX "Account_hotelId_code_idx" ON "Account"("hotelId", "code");
CREATE INDEX "CostCenter_hotelId_idx" ON "CostCenter"("hotelId");
CREATE INDEX "AccountingJournal_hotelId_idx" ON "AccountingJournal"("hotelId");
CREATE INDEX "JournalEntry_hotelId_entryDate_idx" ON "JournalEntry"("hotelId", "entryDate");
CREATE INDEX "JournalEntryLine_entryId_idx" ON "JournalEntryLine"("entryId");
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");
CREATE UNIQUE INDEX "AccountBalance_accountId_periodId_key" ON "AccountBalance"("accountId", "periodId");
CREATE INDEX "BankReconciliation_hotelId_idx" ON "BankReconciliation"("hotelId");

ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AP_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostCenter" ADD CONSTRAINT "CC_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingJournal" ADD CONSTRAINT "AJ_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JE_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JE_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "AccountingJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JE_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JEL_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JEL_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JEL_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AB_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AB_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AB_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BR_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
