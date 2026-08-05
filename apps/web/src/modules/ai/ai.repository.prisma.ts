/**
 * Module 24 — IA : adapter Prisma.
 */
import type {
  AiRepository,
  AiAlert,
  AiFeature,
  AiPrediction,
  AiProvider,
  AiRecommendation,
  AiRequest,
  AiSuggestion,
  CreateAiProviderInput,
  SetFeatureInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue | undefined => v as Prisma.InputJsonValue;

function mapProvider(p: {
  id: string; hotelId: string; name: string; providerKey: string; baseUrl: string | null; model: string | null;
  credentials: unknown; config: unknown; isDefault: boolean; isActive: boolean;
}): AiProvider {
  return { id: p.id, hotelId: p.hotelId, name: p.name, providerKey: p.providerKey, baseUrl: p.baseUrl, model: p.model, credentials: p.credentials as Record<string, unknown> | null, config: p.config as Record<string, unknown> | null, isDefault: p.isDefault, isActive: p.isActive };
}

function mapFeature(f: { id: string; hotelId: string; feature: string; isEnabled: boolean; config: unknown; quotaPerDay: number }): AiFeature {
  return { id: f.id, hotelId: f.hotelId, feature: f.feature, isEnabled: f.isEnabled, config: f.config as Record<string, unknown> | null, quotaPerDay: f.quotaPerDay };
}

export class PrismaAiRepository implements AiRepository {
  // Providers LLM
  async createProvider(hotelId: string, input: CreateAiProviderInput): Promise<AiProvider> {
    const p = await prisma.aiProvider.create({ data: { hotelId, name: input.name, providerKey: input.providerKey, baseUrl: input.baseUrl ?? null, model: input.model ?? null, credentials: input.credentials ? json(input.credentials) : undefined, config: input.config ? json(input.config) : undefined, isDefault: input.isDefault ?? false } });
    return mapProvider(p);
  }
  async listProviders(hotelId: string): Promise<AiProvider[]> {
    const rows = await prisma.aiProvider.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map(mapProvider);
  }
  async getProvider(hotelId: string, providerId: string): Promise<AiProvider | null> {
    const p = await prisma.aiProvider.findFirst({ where: { id: providerId, hotelId } });
    return p ? mapProvider(p) : null;
  }
  async findDefaultProvider(hotelId: string): Promise<AiProvider | null> {
    const p = await prisma.aiProvider.findFirst({ where: { hotelId, isActive: true, isDefault: true } });
    if (p) return mapProvider(p);
    const anyActive = await prisma.aiProvider.findFirst({ where: { hotelId, isActive: true } });
    return anyActive ? mapProvider(anyActive) : null;
  }
  async setProviderActive(hotelId: string, providerId: string, isActive: boolean): Promise<void> {
    await prisma.aiProvider.update({ where: { id: providerId, hotelId }, data: { isActive } });
  }
  async setProviderDefault(hotelId: string, providerId: string): Promise<void> {
    await prisma.$transaction([
      prisma.aiProvider.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      prisma.aiProvider.update({ where: { id: providerId }, data: { isDefault: true } }),
    ]);
  }

  // Features
  async setFeature(hotelId: string, input: SetFeatureInput): Promise<AiFeature> {
    const existing = await prisma.aiFeature.findUnique({ where: { hotelId_feature: { hotelId, feature: input.feature } } });
    const data = { isEnabled: input.isEnabled, config: input.config ? json(input.config) : undefined, quotaPerDay: input.quotaPerDay };
    const f = existing
      ? await prisma.aiFeature.update({ where: { id: existing.id }, data })
      : await prisma.aiFeature.create({ data: { hotelId, feature: input.feature, isEnabled: input.isEnabled, config: input.config ? json(input.config) : undefined, quotaPerDay: input.quotaPerDay ?? 100 } });
    return mapFeature(f);
  }
  async listFeatures(hotelId: string): Promise<AiFeature[]> {
    const rows = await prisma.aiFeature.findMany({ where: { hotelId } });
    return rows.map(mapFeature);
  }
  async isFeatureEnabled(hotelId: string, feature: string): Promise<boolean> {
    const f = await prisma.aiFeature.findUnique({ where: { hotelId_feature: { hotelId, feature } } });
    return f?.isEnabled ?? false;
  }

  // Journal & quotas
  async logRequest(hotelId: string, input: { feature: string; providerKey?: string | null; prompt?: string | null; response?: string | null; status?: string; tokensIn?: number; tokensOut?: number; latencyMs?: number | null; error?: string | null; actorUserId?: string | null }): Promise<AiRequest> {
    const r = await prisma.aiRequest.create({ data: { hotelId, feature: input.feature, providerKey: input.providerKey ?? null, prompt: input.prompt ?? null, response: input.response ?? null, status: input.status ?? "OK", tokensIn: input.tokensIn ?? 0, tokensOut: input.tokensOut ?? 0, latencyMs: input.latencyMs ?? null, error: input.error ?? null, actorUserId: input.actorUserId ?? null } });
    return { id: r.id, hotelId: r.hotelId, feature: r.feature, providerKey: r.providerKey, prompt: r.prompt, response: r.response, status: r.status, tokensIn: r.tokensIn, tokensOut: r.tokensOut, latencyMs: r.latencyMs, error: r.error, actorUserId: r.actorUserId, createdAt: r.createdAt };
  }
  async listRequests(hotelId: string, feature?: string, limit = 100): Promise<AiRequest[]> {
    const rows = await prisma.aiRequest.findMany({ where: { hotelId, ...(feature ? { feature } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((r) => ({ id: r.id, hotelId: r.hotelId, feature: r.feature, providerKey: r.providerKey, prompt: r.prompt, response: r.response, status: r.status, tokensIn: r.tokensIn, tokensOut: r.tokensOut, latencyMs: r.latencyMs, error: r.error, actorUserId: r.actorUserId, createdAt: r.createdAt }));
  }
  async countTodayRequests(hotelId: string, feature: string): Promise<number> {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return prisma.aiRequest.count({ where: { hotelId, feature, createdAt: { gte: start } } });
  }

  // Suggestions
  async createSuggestion(hotelId: string, input: { guestId?: string | null; kind: string; title: string; detail?: string | null; context?: Record<string, unknown> | null; source?: string }): Promise<AiSuggestion> {
    const s = await prisma.aiSuggestion.create({ data: { hotelId, guestId: input.guestId ?? null, kind: input.kind, title: input.title, detail: input.detail ?? null, context: input.context ? json(input.context) : undefined, source: input.source ?? "RULE" } });
    return { id: s.id, hotelId: s.hotelId, guestId: s.guestId, kind: s.kind, title: s.title, detail: s.detail, context: s.context as Record<string, unknown> | null, source: s.source, status: s.status, createdAt: s.createdAt };
  }
  async listSuggestions(hotelId: string, kind?: string, limit = 100): Promise<AiSuggestion[]> {
    const rows = await prisma.aiSuggestion.findMany({ where: { hotelId, ...(kind ? { kind } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((s) => ({ id: s.id, hotelId: s.hotelId, guestId: s.guestId, kind: s.kind, title: s.title, detail: s.detail, context: s.context as Record<string, unknown> | null, source: s.source, status: s.status, createdAt: s.createdAt }));
  }
  async setSuggestionStatus(hotelId: string, suggestionId: string, status: string): Promise<void> {
    await prisma.aiSuggestion.update({ where: { id: suggestionId, hotelId }, data: { status } });
  }

  // Predictions
  async createPrediction(hotelId: string, input: { metric: string; horizon?: string | null; value: number; confidence: number; model?: string; periodStart?: Date | null; periodEnd?: Date | null; context?: Record<string, unknown> | null }): Promise<AiPrediction> {
    const p = await prisma.aiPrediction.create({ data: { hotelId, metric: input.metric, horizon: input.horizon ?? null, value: input.value, confidence: input.confidence, model: input.model ?? "rule", periodStart: input.periodStart ?? null, periodEnd: input.periodEnd ?? null, context: input.context ? json(input.context) : undefined } });
    return { id: p.id, hotelId: p.hotelId, metric: p.metric, horizon: p.horizon, value: p.value.toNumber(), confidence: p.confidence.toNumber(), model: p.model, periodStart: p.periodStart, periodEnd: p.periodEnd, context: p.context as Record<string, unknown> | null, createdAt: p.createdAt };
  }
  async listPredictions(hotelId: string, metric?: string, limit = 100): Promise<AiPrediction[]> {
    const rows = await prisma.aiPrediction.findMany({ where: { hotelId, ...(metric ? { metric } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((p) => ({ id: p.id, hotelId: p.hotelId, metric: p.metric, horizon: p.horizon, value: p.value.toNumber(), confidence: p.confidence.toNumber(), model: p.model, periodStart: p.periodStart, periodEnd: p.periodEnd, context: p.context as Record<string, unknown> | null, createdAt: p.createdAt }));
  }

  // Alerts
  async createAlert(hotelId: string, input: { severity?: string; type: string; title: string; detail?: string | null; context?: Record<string, unknown> | null; source?: string }): Promise<AiAlert> {
    const a = await prisma.aiAlert.create({ data: { hotelId, severity: input.severity ?? "INFO", type: input.type, title: input.title, detail: input.detail ?? null, context: input.context ? json(input.context) : undefined, source: input.source ?? "RULE" } });
    return { id: a.id, hotelId: a.hotelId, severity: a.severity, type: a.type, title: a.title, detail: a.detail, context: a.context as Record<string, unknown> | null, status: a.status, source: a.source, createdAt: a.createdAt };
  }
  async listAlerts(hotelId: string, status?: string, limit = 100): Promise<AiAlert[]> {
    const rows = await prisma.aiAlert.findMany({ where: { hotelId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((a) => ({ id: a.id, hotelId: a.hotelId, severity: a.severity, type: a.type, title: a.title, detail: a.detail, context: a.context as Record<string, unknown> | null, status: a.status, source: a.source, createdAt: a.createdAt }));
  }
  async setAlertStatus(hotelId: string, alertId: string, status: string): Promise<void> {
    await prisma.aiAlert.update({ where: { id: alertId, hotelId }, data: { status } });
  }

  // Recommendations
  async createRecommendation(hotelId: string, input: { guestId: string; kind: string; title: string; detail?: string | null; score?: number; context?: Record<string, unknown> | null }): Promise<AiRecommendation> {
    const r = await prisma.aiRecommendation.create({ data: { hotelId, guestId: input.guestId, kind: input.kind, title: input.title, detail: input.detail ?? null, score: input.score ?? 0, context: input.context ? json(input.context) : undefined } });
    return { id: r.id, hotelId: r.hotelId, guestId: r.guestId, kind: r.kind, title: r.title, detail: r.detail, score: r.score.toNumber(), context: r.context as Record<string, unknown> | null, status: r.status, createdAt: r.createdAt };
  }
  async listRecommendations(hotelId: string, guestId?: string, limit = 100): Promise<AiRecommendation[]> {
    const rows = await prisma.aiRecommendation.findMany({ where: { hotelId, ...(guestId ? { guestId } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((r) => ({ id: r.id, hotelId: r.hotelId, guestId: r.guestId, kind: r.kind, title: r.title, detail: r.detail, score: r.score.toNumber(), context: r.context as Record<string, unknown> | null, status: r.status, createdAt: r.createdAt }));
  }
  async setRecommendationStatus(hotelId: string, recommendationId: string, status: string): Promise<void> {
    await prisma.aiRecommendation.update({ where: { id: recommendationId, hotelId }, data: { status } });
  }

  async guestExists(hotelId: string, guestId: string): Promise<boolean> {
    const g = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return g !== null;
  }
}
