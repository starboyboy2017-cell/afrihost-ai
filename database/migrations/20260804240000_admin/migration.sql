-- ============================================================================
-- AfriHost AI — Module 29 : Administration & Paramétrage Global
-- Migration : 20260804240000_admin
--
-- Centre d'administration SaaS : configuration dynamique, multi-hôtel,
-- extensible. Ajoute :
--   * AdminConfig (clé/valeur JSON scoped SAAS | HOTEL, par catégorie).
--
-- Chaque table porte hotelId (isolation multihôtel via RLS) — nullable pour le
-- scope SAAS global.
-- ============================================================================

-- Entrée de configuration administrative
CREATE TABLE "AdminConfig" (
    "id" TEXT NOT NULL, "scope" TEXT NOT NULL DEFAULT 'HOTEL', "hotelId" TEXT,
    "category" TEXT NOT NULL, "key" TEXT NOT NULL, "value" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminConfig_scope_hotelId_category_idx" ON "AdminConfig"("scope", "hotelId", "category");
CREATE UNIQUE INDEX "AdminConfig_scope_hotelId_category_key_key" ON "AdminConfig"("scope", "hotelId", "category", "key");

ALTER TABLE "AdminConfig" ADD CONSTRAINT "AdminConfig_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
