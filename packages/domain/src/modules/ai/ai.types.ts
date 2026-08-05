/**
 * Module 24 — IA : types du domaine.
 *
 * Couche d'assistance **LLM Provider-Agnostic** et **optionnelle**. L'application
 * fonctionne parfaitement sans IA : chaque fonctionnalité a un équivalent
 * déterministe (règles) lorsque le LLM n'est pas configuré/activé.
 */

/** Fournisseur LLM configurable. */
export interface AiProvider {
  id: string;
  hotelId: string;
  name: string;
  providerKey: string;
  baseUrl?: string | null;
  model?: string | null;
  credentials?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  isDefault: boolean;
  isActive: boolean;
}

/** Configuration d'une fonctionnalité IA. */
export interface AiFeature {
  id: string;
  hotelId: string;
  feature: string;
  isEnabled: boolean;
  config?: Record<string, unknown> | null;
  quotaPerDay: number;
}

/** Journal de requête IA. */
export interface AiRequest {
  id: string;
  hotelId: string;
  feature: string;
  providerKey?: string | null;
  promptHash?: string | null;
  prompt?: string | null;
  response?: string | null;
  status: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs?: number | null;
  error?: string | null;
  actorUserId?: string | null;
  createdAt: Date;
}

/** Suggestion. */
export interface AiSuggestion {
  id: string;
  hotelId: string;
  guestId?: string | null;
  kind: string;
  title: string;
  detail?: string | null;
  context?: Record<string, unknown> | null;
  source: string;
  status: string;
  createdAt: Date;
}

/** Prédiction. */
export interface AiPrediction {
  id: string;
  hotelId: string;
  metric: string;
  horizon?: string | null;
  value: number;
  confidence: number;
  model: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  context?: Record<string, unknown> | null;
  createdAt: Date;
}

/** Alerte. */
export interface AiAlert {
  id: string;
  hotelId: string;
  severity: string;
  type: string;
  title: string;
  detail?: string | null;
  context?: Record<string, unknown> | null;
  status: string;
  source: string;
  createdAt: Date;
}

/** Recommandation. */
export interface AiRecommendation {
  id: string;
  hotelId: string;
  guestId: string;
  kind: string;
  title: string;
  detail?: string | null;
  score: number;
  context?: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateAiProviderInput {
  name: string;
  providerKey: string;
  baseUrl?: string | null;
  model?: string | null;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface SetFeatureInput {
  feature: string;
  isEnabled: boolean;
  config?: Record<string, unknown>;
  quotaPerDay?: number;
}

export interface AssistantQueryInput {
  feature: string; // assistant, search, suggestions, predictions, alerts, recommendations, prioritization, reports, rag
  prompt: string;
  context?: Record<string, unknown>; // données autorisées déjà filtrées par RBAC/RLS
}

/** Résultat d'une requête assistant (peut être déterministe sans LLM). */
export interface AssistantResult {
  text: string;
  source: "llm" | "rule" | "fallback";
  providerKey?: string | null;
  suggestions?: string[];
}

// ---------------------------------------------------------------------------
//  Fonctionnalités IA (constantes)
// ---------------------------------------------------------------------------

export const AI_FEATURES = [
  "assistant",
  "search",
  "suggestions",
  "predictions",
  "alerts",
  "recommendations",
  "prioritization",
  "reports",
  "rag",
] as const;

export type AiFeatureKey = (typeof AI_FEATURES)[number];
