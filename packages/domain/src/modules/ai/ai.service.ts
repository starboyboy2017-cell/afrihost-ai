/**
 * Module 24 — IA : service métier.
 *
 * Couche d'assistance **provider-agnostic** et **optionnelle**. Points clés :
 *   - configuration des fournisseurs LLM par hôtel (OpenAI, Anthropic, Gemini,
 *     Azure, Ollama...) sans modifier le code métier ;
 *   - assistant conversationnel + recherche sur les données **déjà filtrées** ;
 *   - suggestions (check-in/out, upgrade, upsell, cross-sell, fidélisation) ;
 *   - prédictions (occupation, revenus, demande, surcharge, stock) ;
 *   - alertes intelligentes sur anomalies ;
 *   - recommandations personnalisées ;
 *   - priorisation des tâches ;
 *   - génération de rapports ;
 *   - architecture compatible RAG.
 *
 * **SÉCURITÉ & NON-EXIGENCE** : l'IA ne reçoit jamais de données hors RBAC/RLS
 * (l'appelant fournit `context` déjà filtré). Toutes les fonctionnalités ont un
 * équivalent déterministe (`ai.analytics`) : l'application fonctionne sans IA.
 * Quotas + journalisation complète.
 */
import { type AuditTrail, type EventBus } from "@afrihost/core";
import { AiError } from "./ai.error.js";
import { LlmClient, LlmRegistry } from "./ai.llm.js";
import { AiRepository } from "./ai.repository.js";
import {
  buildPrediction,
  buildSuggestions,
  detectAnomalies,
  predictNext,
  prioritizeTasks,
  type OperationalData,
  type TaskForPriority,
} from "./ai.analytics.js";
import type {
  AiAlert,
  AiFeature,
  AiPrediction,
  AiProvider,
  AiRecommendation,
  AiRequest,
  AiSuggestion,
  AssistantQueryInput,
  AssistantResult,
  CreateAiProviderInput,
  SetFeatureInput,
} from "./ai.types.js";
import {
  validateAssistantQuery,
  validateCreateAiProvider,
  validateSetFeature,
} from "./ai.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface AiActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class AiService {
  constructor(
    private readonly repo: AiRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
    private readonly llm: LlmRegistry = {},
  ) {}

  // ---------------------------------------------------------------------------
  // Fournisseurs LLM
  // ---------------------------------------------------------------------------

  async createProvider(hotelId: string, input: CreateAiProviderInput, actor: AiActor): Promise<AiProvider> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateAiProvider(input);
    const provider = await this.repo.createProvider(hotelId, v);
    if (v.isDefault) await this.repo.setProviderDefault(hotelId, provider.id);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "ai.provider.create", entityType: "AiProvider", entityId: provider.id, after: { name: v.name, providerKey: v.providerKey } });
    return provider;
  }

  async listProviders(hotelId: string, actor: AiActor): Promise<AiProvider[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listProviders(hotelId);
  }

  async setProviderActive(hotelId: string, providerId: string, isActive: boolean, actor: AiActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setProviderActive(hotelId, providerId, isActive);
  }

  async setProviderDefault(hotelId: string, providerId: string, actor: AiActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setProviderDefault(hotelId, providerId);
  }

  // ---------------------------------------------------------------------------
  // Configuration des fonctionnalités (IA jamais obligatoire)
  // ---------------------------------------------------------------------------

  async setFeature(hotelId: string, input: SetFeatureInput, actor: AiActor): Promise<AiFeature> {
    this.assertHotel(hotelId, actor);
    const v = validateSetFeature(input);
    const feature = await this.repo.setFeature(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "ai.feature.configure", entityType: "AiFeature", entityId: feature.id, after: { feature: v.feature, isEnabled: v.isEnabled } });
    return feature;
  }

  async listFeatures(hotelId: string, actor: AiActor): Promise<AiFeature[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listFeatures(hotelId);
  }

  // ---------------------------------------------------------------------------
  // Assistant conversationnel / recherche (respecte RLS/RBAC via `context`)
  // ---------------------------------------------------------------------------

  /**
   * Répond à une question. `context` doit contenir UNIQUEMENT les données déjà
   * filtrées par RBAC/RLS. Sans LLM configuré, retourne un fallback déterministe.
   */
  async assistant(hotelId: string, input: AssistantQueryInput, actor: AiActor): Promise<AssistantResult> {
    this.assertHotel(hotelId, actor);
    const v = validateAssistantQuery(input);
    // Quota
    const quota = await this.getQuota(hotelId, v.feature);
    const usedToday = await this.repo.countTodayRequests(hotelId, v.feature);
    if (usedToday >= quota) {
      await this.log(hotelId, v.feature, actor, null, v.prompt, "QUOTA_EXCEEDED");
      throw new AiError("Quota journalier de requêtes IA dépassé");
    }

    const provider = await this.repo.findDefaultProvider(hotelId);
    const client = provider ? this.llm[provider.providerKey] : undefined;

    // Pas de LLM configuré/actif → fallback déterministe (jamais de blocage).
    if (!provider || !client || !provider.isActive) {
      const result: AssistantResult = { text: this.fallbackReply(v.feature, v.prompt, v.context), source: "fallback" };
      await this.log(hotelId, v.feature, actor, null, v.prompt, "SKIPPED", result.text);
      return result;
    }

    const start = Date.now();
    try {
      const llmResult = await client.complete(provider, [
        { role: "system", content: this.systemPrompt(v.feature, v.context) },
        { role: "user", content: v.prompt },
      ]);
      await this.log(hotelId, v.feature, actor, provider.providerKey, v.prompt, "OK", llmResult.text, llmResult.tokensIn, llmResult.tokensOut, Date.now() - start);
      return { text: llmResult.text, source: "llm", providerKey: provider.providerKey };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur LLM";
      await this.log(hotelId, v.feature, actor, provider.providerKey, v.prompt, "ERROR", null, 0, 0, Date.now() - start, msg);
      return { text: this.fallbackReply(v.feature, v.prompt, v.context), source: "rule" };
    }
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /** Génère des suggestions opérationnelles (déterministes par défaut). */
  async generateSuggestions(hotelId: string, data: OperationalData, actor: AiActor): Promise<AiSuggestion[]> {
    this.assertHotel(hotelId, actor);
    const items = buildSuggestions(data);
    const created: AiSuggestion[] = [];
    for (const s of items) {
      created.push(await this.repo.createSuggestion(hotelId, s));
    }
    return created;
  }

  async listSuggestions(hotelId: string, kind: string | undefined, actor: AiActor): Promise<AiSuggestion[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listSuggestions(hotelId, kind, 100);
  }

  async setSuggestionStatus(hotelId: string, suggestionId: string, status: string, actor: AiActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setSuggestionStatus(hotelId, suggestionId, status);
  }

  // ---------------------------------------------------------------------------
  // Prédictions (déterministes sans IA)
  // ---------------------------------------------------------------------------

  /** Prédit l'occupation / les revenus à partir d'une série temporelle (règle). */
  async predict(hotelId: string, metric: string, values: number[], horizon: string, periodStart: Date, periodEnd: Date, actor: AiActor): Promise<AiPrediction> {
    this.assertHotel(hotelId, actor);
    const base = buildPrediction(metric, values, horizon, periodStart, periodEnd);
    const prediction = await this.repo.createPrediction(hotelId, {
      metric, horizon, value: base.value, confidence: base.confidence, model: "rule", periodStart, periodEnd, context: base.context,
    });
    return prediction;
  }

  /** Prédiction simple d'une valeur future (moyenne mobile + tendance). */
  forecastNext(hotelId: string, values: number[], actor: AiActor): number {
    this.assertHotel(hotelId, actor);
    return predictNext(values);
  }

  async listPredictions(hotelId: string, metric: string | undefined, actor: AiActor): Promise<AiPrediction[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listPredictions(hotelId, metric, 100);
  }

  // ---------------------------------------------------------------------------
  // Alertes (règles)
  // ---------------------------------------------------------------------------

  async runAlerts(hotelId: string, data: OperationalData, actor: AiActor): Promise<AiAlert[]> {
    this.assertHotel(hotelId, actor);
    const alerts = detectAnomalies(data);
    const created: AiAlert[] = [];
    for (const a of alerts) {
      created.push(await this.repo.createAlert(hotelId, { severity: a.severity, type: a.type, title: a.title, detail: a.detail, source: "RULE" }));
    }
    return created;
  }

  async listAlerts(hotelId: string, status: string | undefined, actor: AiActor): Promise<AiAlert[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listAlerts(hotelId, status, 100);
  }

  async setAlertStatus(hotelId: string, alertId: string, status: string, actor: AiActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setAlertStatus(hotelId, alertId, status);
  }

  // ---------------------------------------------------------------------------
  // Recommandations (règles)
  // ---------------------------------------------------------------------------

  /** Recommandation personnalisée simple basée sur le profil passé (fourni filtré). */
  async recommend(hotelId: string, guestId: string, kind: string, title: string, score: number, actor: AiActor): Promise<AiRecommendation> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.guestExists(hotelId, guestId))) throw new AiError("Client introuvable");
    return this.repo.createRecommendation(hotelId, { guestId, kind, title, score });
  }

  async listRecommendations(hotelId: string, guestId: string | undefined, actor: AiActor): Promise<AiRecommendation[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRecommendations(hotelId, guestId, 100);
  }

  async setRecommendationStatus(hotelId: string, recommendationId: string, status: string, actor: AiActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setRecommendationStatus(hotelId, recommendationId, status);
  }

  // ---------------------------------------------------------------------------
  // Priorisation des tâches (déterministe)
  // ---------------------------------------------------------------------------

  prioritize(hotelId: string, tasks: TaskForPriority[], actor: AiActor): TaskForPriority[] {
    this.assertHotel(hotelId, actor);
    return prioritizeTasks(tasks);
  }

  // ---------------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------------

  async listRequests(hotelId: string, feature: string | undefined, actor: AiActor): Promise<AiRequest[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRequests(hotelId, feature, 100);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getQuota(hotelId: string, feature: string): Promise<number> {
    const features = await this.repo.listFeatures(hotelId);
    const f = features.find((x) => x.feature === feature);
    return f?.quotaPerDay ?? 100;
  }

  private async log(hotelId: string, feature: string, actor: AiActor, providerKey: string | null, prompt: string | null, status: string, response?: string | null, tokensIn?: number, tokensOut?: number, latencyMs?: number, error?: string | null): Promise<void> {
    await this.repo.logRequest(hotelId, { feature, providerKey, prompt, response: response ?? null, status, tokensIn: tokensIn ?? 0, tokensOut: tokensOut ?? 0, latencyMs: latencyMs ?? null, error: error ?? null, actorUserId: actor.actorUserId });
  }

  private systemPrompt(feature: string, context?: Record<string, unknown>): string {
    const base = "Tu es l'assistant d'aide du PMS AfriHost AI. Réponds de façon concise et professionnelle. Ne révéle jamais de données hors de celles fournies dans le contexte. Respecte l'isolation multi-hôtel : ne réponds qu'à propos de l'hôtel courant.";
    const featureHint = {
      assistant: "Assiste le personnel (réception, gestion, administration) dans ses tâches.",
      search: "Recherche conversationnelle sur les données autorisées fournies dans le contexte uniquement.",
      suggestions: "Propose des suggestions opérationnelles (check-in/out, upgrade, upsell, cross-sell, fidélisation).",
      predictions: "Explique les prédictions d'occupation, revenus, demande, surcharge, stock à partir des données fournies.",
      alerts: "Explique les anomalies détectées (paiements en retard, chambres indisponibles, ruptures de stock, incidents).",
      recommendations: "Donne des recommandations personnalisées basées sur le comportement fourni.",
      prioritization: "Aide à prioriser les tâches opérationnelles.",
      reports: "Génère un rapport / analyse / tableau de bord à partir des données fournies.",
      rag: "Répond en t'appuyant uniquement sur les documents internes fournis dans le contexte.",
    } as Record<string, string>;
    return `${base}\nFonctionnalité : ${featureHint[feature] ?? "assistance générale"}\n${context ? `Contexte (données autorisées) : ${JSON.stringify(context)}` : ""}`;
  }

  private fallbackReply(feature: string, prompt: string, context?: Record<string, unknown>): string {
    const enabled = Object.keys(context ?? {}).length;
    switch (feature) {
      case "suggestions":
        return "L'assistant IA n'est pas configuré pour cet hôtel. Les suggestions opérationnelles sont disponibles via les règles déterministes (voir /api/ai/suggestions).";
      case "predictions":
        return "L'assistant IA n'est pas configuré. Les prédictions d'occupation/revenus sont fournies par le moteur de règles (voir /api/ai/predictions).";
      case "alerts":
        return "L'assistant IA n'est pas configuré. Les alertes d'anomalies sont détectées par les règles (voir /api/ai/alerts).";
      default:
        return `Assistant IA non configuré pour cet hôtel (fonctionnalité "${feature}"). L'application fonctionne sans IA via des règles déterministes. Aide demandée : ${prompt}${enabled > 0 ? ` (${enabled} champ(s) de contexte fourni(s))` : ""}`;
    }
  }

  private assertHotel(hotelId: string, actor: AiActor): void {
    if (actor.hotelId !== hotelId) throw new AiError("Accès inter-hôtel refusé");
  }
}
