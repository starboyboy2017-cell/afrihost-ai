-- ============================================================================
-- AfriHost AI — Sous-module 33.1 : Bootstrap & Initialisation du SaaS
-- Migration : 20260804281000_bootstrap
--
-- Ajoute les champs de sécurité sur User pour le premier compte SUPER_ADMIN
-- (additif) : mustChangePassword, twoFactorEnabled, twoFactorSecret,
-- isSuperAdmin.
-- ============================================================================

ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
