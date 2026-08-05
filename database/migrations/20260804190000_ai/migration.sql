-- ============================================================================
-- AfriHost AI — Module 24 : IA (assistant, prédictions, automatisation)
-- Migration : 20260804190000_ai
--
-- Couche d'assistance LLM Provider-Agnostic et OPTIONNELLE : l'application
-- fonctionne parfaitement sans IA (les fonctionnalités ont des équivalents
-- déterministes). Ajoute :
--   * AiProvider (fournisseur LLM configurable) ;
--   * AiFeature (configuration par hôtel des fonctionnalités + quotas) ;
--   * AiRequest (journal complet des requêtes IA) ;
--   * AiSuggestion, AiPrediction, AiAlert, AiRecommendation.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Fournisseur LLM
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL, "baseUrl" TEXT, "model" TEXT,
    "credentials" JSONB, "config" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- Configuration fonctionnalité + quota
CREATE TABLE "AiFeature" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "feature" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB, "quotaPerDay" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiFeature_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AiFeature_hotelId_feature_key" UNIQUE ("hotelId", "feature")
);

-- Journal des requêtes IA
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "feature" TEXT NOT NULL,
    "providerKey" TEXT, "promptHash" TEXT, "prompt" TEXT, "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OK', "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0, "latencyMs" INTEGER, "error" TEXT, "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- Suggestion
CREATE TABLE "AiSuggestion" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT, "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL, "detail" TEXT, "context" JSONB,
    "source" TEXT NOT NULL DEFAULT 'AI', "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

-- Prédiction
CREATE TABLE "AiPrediction" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "metric" TEXT NOT NULL, "horizon" TEXT,
    "value" DECIMAL NOT NULL DEFAULT 0, "confidence" DECIMAL NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL DEFAULT 'rule', "periodStart" TIMESTAMP(3), "periodEnd" TIMESTAMP(3),
    "context" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiPrediction_pkey" PRIMARY KEY ("id")
);

-- Alerte
CREATE TABLE "AiAlert" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'INFO',
    "type" TEXT NOT NULL, "title" TEXT NOT NULL, "detail" TEXT, "context" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN', "source" TEXT NOT NULL DEFAULT 'RULE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAlert_pkey" PRIMARY KEY ("id")
);

-- Recommandation
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "guestId" TEXT NOT NULL, "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL, "detail" TEXT, "score" DECIMAL NOT NULL DEFAULT 0, "context" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NEW', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "AiProvider_hotelId_isActive_idx" ON "AiProvider"("hotelId", "isActive");
CREATE INDEX "AiFeature_hotelId_idx" ON "AiFeature"("hotelId");
CREATE INDEX "AiRequest_hotelId_createdAt_idx" ON "AiRequest"("hotelId", "createdAt");
CREATE INDEX "AiRequest_hotelId_feature_createdAt_idx" ON "AiRequest"("hotelId", "feature", "createdAt");
CREATE INDEX "AiSuggestion_hotelId_kind_idx" ON "AiSuggestion"("hotelId", "kind");
CREATE INDEX "AiSuggestion_guestId_idx" ON "AiSuggestion"("guestId");
CREATE INDEX "AiPrediction_hotelId_metric_idx" ON "AiPrediction"("hotelId", "metric");
CREATE INDEX "AiPrediction_hotelId_createdAt_idx" ON "AiPrediction"("hotelId", "createdAt");
CREATE INDEX "AiAlert_hotelId_status_idx" ON "AiAlert"("hotelId", "status");
CREATE INDEX "AiAlert_hotelId_type_idx" ON "AiAlert"("hotelId", "type");
CREATE INDEX "AiRecommendation_hotelId_guestId_idx" ON "AiRecommendation"("hotelId", "guestId");

-- Clés étrangères
ALTER TABLE "AiProvider" ADD CONSTRAINT "AiProvider_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiFeature" ADD CONSTRAINT "AiFeature_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiAlert" ADD CONSTRAINT "AiAlert_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
