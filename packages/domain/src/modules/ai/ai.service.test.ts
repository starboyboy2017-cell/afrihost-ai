import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { AiService, type AiActor } from "./ai.service.js";
import { AiError } from "./ai.error.js";
import type { AiRepository } from "./ai.repository.js";
import type { LlmClient } from "./ai.llm.js";
import type { OperationalData } from "./ai.analytics.js";
import type {
  AiAlert, AiFeature, AiPrediction, AiProvider, AiRecommendation, AiRequest, AiSuggestion,
  CreateAiProviderInput, SetFeatureInput,
} from "./ai.types.js";

let seq = 0;

class MemoryRepo implements AiRepository {
  providers: AiProvider[] = [];
  features: AiFeature[] = [];
  requests: AiRequest[] = [];
  suggestions: AiSuggestion[] = [];
  predictions: AiPrediction[] = [];
  alerts: AiAlert[] = [];
  recommendations: AiRecommendation[] = [];
  guestIds = new Set<string>();
  todayCount = new Map<string, number>();

  async createProvider(hotelId: string, input: CreateAiProviderInput): Promise<AiProvider> {
    const p: AiProvider = { id: `ap-${++seq}`, hotelId, name: input.name, providerKey: input.providerKey, baseUrl: input.baseUrl ?? null, model: input.model ?? null, credentials: input.credentials ?? null, config: input.config ?? null, isDefault: input.isDefault ?? false, isActive: true };
    this.providers.push(p); return p;
  }
  async listProviders(hotelId: string): Promise<AiProvider[]> { return this.providers.filter((p) => p.hotelId === hotelId); }
  async getProvider(hotelId: string, providerId: string): Promise<AiProvider | null> { return this.providers.find((p) => p.id === providerId && p.hotelId === hotelId) ?? null; }
  async findDefaultProvider(hotelId: string): Promise<AiProvider | null> { return this.providers.find((p) => p.hotelId === hotelId && p.isDefault && p.isActive) ?? this.providers.find((p) => p.hotelId === hotelId && p.isActive) ?? null; }
  async setProviderActive(hotelId: string, providerId: string, isActive: boolean): Promise<void> { const p = this.providers.find((x) => x.id === providerId)!; p.isActive = isActive; }
  async setProviderDefault(hotelId: string, providerId: string): Promise<void> { this.providers.forEach((p) => { p.isDefault = p.id === providerId; }); }

  async setFeature(hotelId: string, input: SetFeatureInput): Promise<AiFeature> {
    const existing = this.features.find((f) => f.hotelId === hotelId && f.feature === input.feature);
    if (existing) { existing.isEnabled = input.isEnabled; existing.config = input.config ?? null; existing.quotaPerDay = input.quotaPerDay ?? existing.quotaPerDay; return existing; }
    const f: AiFeature = { id: `af-${++seq}`, hotelId, feature: input.feature, isEnabled: input.isEnabled, config: input.config ?? null, quotaPerDay: input.quotaPerDay ?? 100 };
    this.features.push(f); return f;
  }
  async listFeatures(hotelId: string): Promise<AiFeature[]> { return this.features.filter((f) => f.hotelId === hotelId); }
  async isFeatureEnabled(hotelId: string, feature: string): Promise<boolean> { return this.features.some((f) => f.hotelId === hotelId && f.feature === feature && f.isEnabled); }

  async logRequest(hotelId: string, input: { feature: string; providerKey?: string | null; prompt?: string | null; response?: string | null; status?: string; tokensIn?: number; tokensOut?: number; latencyMs?: number | null; error?: string | null; actorUserId?: string | null }): Promise<AiRequest> {
    const r: AiRequest = { id: `ar-${++seq}`, hotelId, feature: input.feature, providerKey: input.providerKey ?? null, prompt: input.prompt ?? null, response: input.response ?? null, status: input.status ?? "OK", tokensIn: input.tokensIn ?? 0, tokensOut: input.tokensOut ?? 0, latencyMs: input.latencyMs ?? null, error: input.error ?? null, actorUserId: input.actorUserId ?? null, createdAt: new Date() };
    this.requests.push(r); return r;
  }
  async listRequests(hotelId: string, feature?: string, limit = 100): Promise<AiRequest[]> { return this.requests.filter((r) => r.hotelId === hotelId && (feature ? r.feature === feature : true)).slice(0, limit); }
  async countTodayRequests(hotelId: string, feature: string): Promise<number> { return this.requests.filter((r) => r.hotelId === hotelId && r.feature === feature).length; }

  async createSuggestion(hotelId: string, input: { guestId?: string | null; kind: string; title: string; detail?: string | null; context?: Record<string, unknown> | null; source?: string }): Promise<AiSuggestion> {
    const s: AiSuggestion = { id: `as-${++seq}`, hotelId, guestId: input.guestId ?? null, kind: input.kind, title: input.title, detail: input.detail ?? null, context: input.context ?? null, source: input.source ?? "RULE", status: "NEW", createdAt: new Date() };
    this.suggestions.push(s); return s;
  }
  async listSuggestions(hotelId: string, kind?: string, limit = 100): Promise<AiSuggestion[]> { return this.suggestions.filter((s) => s.hotelId === hotelId && (kind ? s.kind === kind : true)).slice(0, limit); }
  async setSuggestionStatus(hotelId: string, suggestionId: string, status: string): Promise<void> { const s = this.suggestions.find((x) => x.id === suggestionId)!; s.status = status; }

  async createPrediction(hotelId: string, input: { metric: string; horizon?: string | null; value: number; confidence: number; model?: string; periodStart?: Date | null; periodEnd?: Date | null; context?: Record<string, unknown> | null }): Promise<AiPrediction> {
    const p: AiPrediction = { id: `ap-${++seq}`, hotelId, metric: input.metric, horizon: input.horizon ?? null, value: input.value, confidence: input.confidence, model: input.model ?? "rule", periodStart: input.periodStart ?? null, periodEnd: input.periodEnd ?? null, context: input.context ?? null, createdAt: new Date() };
    this.predictions.push(p); return p;
  }
  async listPredictions(hotelId: string, metric?: string, limit = 100): Promise<AiPrediction[]> { return this.predictions.filter((p) => p.hotelId === hotelId && (metric ? p.metric === metric : true)).slice(0, limit); }

  async createAlert(hotelId: string, input: { severity?: string; type: string; title: string; detail?: string | null; context?: Record<string, unknown> | null; source?: string }): Promise<AiAlert> {
    const a: AiAlert = { id: `aa-${++seq}`, hotelId, severity: input.severity ?? "INFO", type: input.type, title: input.title, detail: input.detail ?? null, context: input.context ?? null, status: "OPEN", source: input.source ?? "RULE", createdAt: new Date() };
    this.alerts.push(a); return a;
  }
  async listAlerts(hotelId: string, status?: string, limit = 100): Promise<AiAlert[]> { return this.alerts.filter((a) => a.hotelId === hotelId && (status ? a.status === status : true)).slice(0, limit); }
  async setAlertStatus(hotelId: string, alertId: string, status: string): Promise<void> { const a = this.alerts.find((x) => x.id === alertId)!; a.status = status; }

  async createRecommendation(hotelId: string, input: { guestId: string; kind: string; title: string; detail?: string | null; score?: number; context?: Record<string, unknown> | null }): Promise<AiRecommendation> {
    const r: AiRecommendation = { id: `ar-${++seq}`, hotelId, guestId: input.guestId, kind: input.kind, title: input.title, detail: input.detail ?? null, score: input.score ?? 0, context: input.context ?? null, status: "NEW", createdAt: new Date() };
    this.recommendations.push(r); return r;
  }
  async listRecommendations(hotelId: string, guestId?: string, limit = 100): Promise<AiRecommendation[]> { return this.recommendations.filter((r) => r.hotelId === hotelId && (guestId ? r.guestId === guestId : true)).slice(0, limit); }
  async setRecommendationStatus(hotelId: string, recommendationId: string, status: string): Promise<void> { const r = this.recommendations.find((x) => x.id === recommendationId)!; r.status = status; }

  async guestExists(hotelId: string, guestId: string): Promise<boolean> { return this.guestIds.has(guestId); }
}

const actorH1: AiActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build(llm: LlmClient[] = []) {
  const repo = new MemoryRepo();
  repo.guestIds.add("g1");
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const registry: Record<string, LlmClient> = {};
  for (const c of llm) registry[c.providerKey] = c;
  const svc = new AiService(repo, audit, bus, registry);
  return { repo, svc };
}

// Client LLM factice
const fakeLlm: LlmClient = {
  providerKey: "fake-llm",
  async complete(_provider, messages) {
    const userMsg = messages.find((m) => m.role === "user")?.content ?? "";
    return { text: `LLM(${userMsg.length})`, tokensIn: 10, tokensOut: 5, latencyMs: 20 };
  },
};

describe("ai.service", () => {
  beforeEach(() => { seq = 0; });

  it("crée un fournisseur LLM configurable", async () => {
    const { svc } = build();
    const p = await svc.createProvider("h1", { name: "OpenAI", providerKey: "openai", model: "gpt-4o" }, actorH1);
    expect(p.id).toBeTruthy();
    expect(p.providerKey).toBe("openai");
  });

  it("configure une fonctionnalité (IA jamais obligatoire)", async () => {
    const { svc } = build();
    const f = await svc.setFeature("h1", { feature: "assistant", isEnabled: false }, actorH1);
    expect(f.isEnabled).toBe(false);
    const enabled = await svc.setFeature("h1", { feature: "predictions", isEnabled: true, quotaPerDay: 500 }, actorH1);
    expect(enabled.isEnabled).toBe(true);
    expect(enabled.quotaPerDay).toBe(500);
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.listProviders("h2", actorH1)).rejects.toThrow(AiError);
  });

  it("assistant sans LLM configuré → fallback déterministe (app fonctionne sans IA)", async () => {
    const { repo, svc } = build();
    const res = await svc.assistant("h1", { feature: "assistant", prompt: "Que faire ?" }, actorH1);
    expect(res.source).toBe("fallback");
    expect(res.text).toContain("non configuré");
    // Journalisé en SKIPPED
    expect(repo.requests.some((r) => r.status === "SKIPPED")).toBe(true);
  });

  it("assistant avec LLM configuré → répond via le client", async () => {
    const { svc } = build([fakeLlm]);
    await svc.createProvider("h1", { name: "Fake", providerKey: "fake-llm", isDefault: true }, actorH1);
    const res = await svc.assistant("h1", { feature: "assistant", prompt: "Bonjour", context: { hotelName: "Demo" } }, actorH1);
    expect(res.source).toBe("llm");
    expect(res.text).toContain("LLM(");
    expect(res.providerKey).toBe("fake-llm");
  });

  it("assistant : quota dépassé → erreur", async () => {
    const { svc } = build();
    await svc.setFeature("h1", { feature: "search", isEnabled: true, quotaPerDay: 1 }, actorH1);
    await svc.assistant("h1", { feature: "search", prompt: "q1" }, actorH1);
    await expect(svc.assistant("h1", { feature: "search", prompt: "q2" }, actorH1)).rejects.toThrow("Quota");
  });

  it("génère des suggestions opérationnelles déterministes", async () => {
    const { repo, svc } = build();
    const items = await svc.generateSuggestions("h1", {
      availableRooms: 2, expectedArrivals: [{ guestId: "g1", vip: true }, { guestId: "g2" }],
    } as unknown as OperationalData, actorH1);
    expect(items.length).toBeGreaterThan(0);
    expect(repo.suggestions.some((s) => s.kind === "upgrade")).toBe(true);
    expect(repo.suggestions.some((s) => s.kind === "cross_sell")).toBe(true);
  });

  it("prédit une valeur (moteur de règles)", async () => {
    const { svc } = build();
    const p = await svc.predict("h1", "occupancy", [50, 55, 60, 65], "week", new Date(), new Date(), actorH1);
    expect(p.model).toBe("rule");
    expect(p.value).toBeGreaterThan(0);
    expect(p.confidence).toBeGreaterThan(0);
  });

  it("détecte des alertes par règles", async () => {
    const { repo, svc } = build();
    const alerts = await svc.runAlerts("h1", { latePayments: 2 } as unknown as OperationalData, actorH1);
    expect(alerts.length).toBeGreaterThan(0);
    expect(repo.alerts.some((a) => a.type === "late_payment")).toBe(true);
  });

  it("crée une recommandation pour un client existant", async () => {
    const { repo, svc } = build();
    const r = await svc.recommend("h1", "g1", "dining", "Proposer le dîner", 0.8, actorH1);
    expect(r.score).toBe(0.8);
    await expect(svc.recommend("h1", "inexistant", "dining", "x", 0.1, actorH1)).rejects.toThrow("introuvable");
  });

  it("priorise des tâches", async () => {
    const { svc } = build();
    const ordered = svc.prioritize("h1", [
      { id: "a", title: "info", severity: "INFO", dueInMinutes: 60 },
      { id: "b", title: "urgent", severity: "CRITICAL", dueInMinutes: -5 },
    ], actorH1);
    expect(ordered[0]!.id).toBe("b");
  });

  it("journalise toutes les requêtes", async () => {
    const { repo, svc } = build([fakeLlm]);
    await svc.createProvider("h1", { name: "Fake", providerKey: "fake-llm", isDefault: true }, actorH1);
    await svc.assistant("h1", { feature: "reports", prompt: "Rapport" }, actorH1);
    const reqs = await svc.listRequests("h1", "reports", actorH1);
    expect(reqs.length).toBe(1);
    expect(reqs[0]!.tokensOut).toBe(5);
  });
});
