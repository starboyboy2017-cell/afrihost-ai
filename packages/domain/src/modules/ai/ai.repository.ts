/**
 * Module 24 — IA : port de persistance.
 */
import type {
  AiAlert,
  AiFeature,
  AiPrediction,
  AiProvider,
  AiRecommendation,
  AiRequest,
  AiSuggestion,
  CreateAiProviderInput,
  SetFeatureInput,
} from "./ai.types.js";

export interface AiRepository {
  // Providers LLM
  createProvider(hotelId: string, input: CreateAiProviderInput): Promise<AiProvider>;
  listProviders(hotelId: string): Promise<AiProvider[]>;
  getProvider(hotelId: string, providerId: string): Promise<AiProvider | null>;
  findDefaultProvider(hotelId: string): Promise<AiProvider | null>;
  setProviderActive(hotelId: string, providerId: string, isActive: boolean): Promise<void>;
  setProviderDefault(hotelId: string, providerId: string): Promise<void>;

  // Features (config par hôtel)
  setFeature(hotelId: string, input: SetFeatureInput): Promise<AiFeature>;
  listFeatures(hotelId: string): Promise<AiFeature[]>;
  isFeatureEnabled(hotelId: string, feature: string): Promise<boolean>;

  // Journal & quotas
  logRequest(hotelId: string, input: { feature: string; providerKey?: string | null; prompt?: string | null; response?: string | null; status?: string; tokensIn?: number; tokensOut?: number; latencyMs?: number | null; error?: string | null; actorUserId?: string | null }): Promise<AiRequest>;
  listRequests(hotelId: string, feature?: string, limit?: number): Promise<AiRequest[]>;
  countTodayRequests(hotelId: string, feature: string): Promise<number>;

  // Suggestions
  createSuggestion(hotelId: string, input: { guestId?: string | null; kind: string; title: string; detail?: string | null; context?: Record<string, unknown> | null; source?: string }): Promise<AiSuggestion>;
  listSuggestions(hotelId: string, kind?: string, limit?: number): Promise<AiSuggestion[]>;
  setSuggestionStatus(hotelId: string, suggestionId: string, status: string): Promise<void>;

  // Predictions
  createPrediction(hotelId: string, input: { metric: string; horizon?: string | null; value: number; confidence: number; model?: string; periodStart?: Date | null; periodEnd?: Date | null; context?: Record<string, unknown> | null }): Promise<AiPrediction>;
  listPredictions(hotelId: string, metric?: string, limit?: number): Promise<AiPrediction[]>;

  // Alerts
  createAlert(hotelId: string, input: { severity?: string; type: string; title: string; detail?: string | null; context?: Record<string, unknown> | null; source?: string }): Promise<AiAlert>;
  listAlerts(hotelId: string, status?: string, limit?: number): Promise<AiAlert[]>;
  setAlertStatus(hotelId: string, alertId: string, status: string): Promise<void>;

  // Recommendations
  createRecommendation(hotelId: string, input: { guestId: string; kind: string; title: string; detail?: string | null; score?: number; context?: Record<string, unknown> | null }): Promise<AiRecommendation>;
  listRecommendations(hotelId: string, guestId?: string, limit?: number): Promise<AiRecommendation[]>;
  setRecommendationStatus(hotelId: string, recommendationId: string, status: string): Promise<void>;

  // Accès aux données (déjà filtrées par RBAC/RLS côté appelant)
  guestExists(hotelId: string, guestId: string): Promise<boolean>;
}
