import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { TipsService, type TipsActor } from "./tips.service.js";
import { TipsError } from "./tips.error.js";
import type { TipsRepository } from "./tips.repository.js";
import type {
  CreateTipInput,
  CreateTipRuleInput,
  Tip,
  TipAllocation,
  TipFilter,
  TipRule,
  TipStatus,
} from "./tips.types.js";

type StoredTip = Tip & { allocations: TipAllocation[]; events: string[] };

class MemoryRepo implements TipsRepository {
  rules = new Map<string, TipRule>();
  tips = new Map<string, StoredTip>();
  posPayments = new Set<string>(["pp1"]);
  seq = 0;

  async createRule(hotelId: string, input: CreateTipRuleInput): Promise<TipRule> {
    const r: TipRule = { id: `tr-${++this.seq}`, hotelId, name: input.name, isActive: true, serverPercent: input.serverPercent ?? 60, teamPercent: input.teamPercent ?? 30, kitchenPercent: input.kitchenPercent ?? 10, otherPercent: input.otherPercent ?? 0, createdAt: new Date(), updatedAt: new Date() };
    this.rules.set(r.id, r);
    return r;
  }
  async listRules(hotelId: string): Promise<TipRule[]> { return [...this.rules.values()].filter((r) => r.hotelId === hotelId); }
  async getRule(hotelId: string, id: string): Promise<TipRule | null> { const r = this.rules.get(id); return r && r.hotelId === hotelId ? r : null; }
  async createTip(hotelId: string, input: CreateTipInput): Promise<Tip> {
    const t: StoredTip = { id: `tip-${++this.seq}`, hotelId, posPaymentId: input.posPaymentId ?? null, posOrderId: input.posOrderId ?? null, type: input.type, status: "PENDING", amount: input.amount, method: input.method, tipRuleId: input.tipRuleId ?? null, note: input.note ?? null, allocations: [], events: [], createdAt: new Date(), updatedAt: new Date() };
    this.tips.set(t.id, t);
    return t;
  }
  async getTip(hotelId: string, id: string): Promise<Tip | null> { const t = this.tips.get(id); return t && t.hotelId === hotelId ? t : null; }
  async setTipStatus(hotelId: string, id: string, status: TipStatus, meta?: { by?: string; at?: Date }): Promise<Tip> {
    const t = this.tips.get(id)!;
    const next = { ...t, status, updatedAt: new Date() } as StoredTip;
    if (status === "VALIDATED") { next.validatedBy = meta?.by ?? null; next.validatedAt = meta?.at ?? new Date(); }
    if (status === "DISTRIBUTED") next.distributedAt = meta?.at ?? new Date();
    if (status === "CANCELLED") { next.cancelledBy = meta?.by ?? null; next.cancelledAt = meta?.at ?? new Date(); }
    this.tips.set(id, next);
    return next;
  }
  async listTips(filter: TipFilter): Promise<{ tips: Tip[]; total: number }> {
    let list = [...this.tips.values()].filter((t) => t.hotelId === filter.hotelId);
    if (filter.status) list = list.filter((t) => t.status === filter.status);
    if (filter.type) list = list.filter((t) => t.type === filter.type);
    return { tips: list, total: list.length };
  }
  async addAllocation(tipId: string, recipient: string, amount: number): Promise<TipAllocation> {
    const t = this.tips.get(tipId)!;
    const a: TipAllocation = { id: `a${t.allocations.length}`, tipId, recipient, amount, createdAt: new Date() };
    t.allocations.push(a);
    return a;
  }
  async listAllocations(tipId: string): Promise<TipAllocation[]> { return this.tips.get(tipId)?.allocations ?? []; }
  async logTipEvent(tipId: string, action: string, actor?: string, detail?: string): Promise<void> {
    const t = this.tips.get(tipId);
    if (t) t.events.push(action);
  }
  async posPaymentExists(hotelId: string, id: string): Promise<boolean> { return this.posPayments.has(id); }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new TipsService(repo, audit, bus);
  const actor: TipsActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 16 — Pourboires", () => {
  it("crée une règle de répartition configurable par hôtel", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Standard", serverPercent: 60, teamPercent: 30, kitchenPercent: 10 }, actor);
    expect(rule.serverPercent).toBe(60);
    expect(rule.kitchenPercent).toBe(10);
  });

  it("rejette une règle dont les pourcentages ne font pas 100", async () => {
    const { service, actor } = setup();
    await expect(service.createRule("h1", { name: "Invalide", serverPercent: 50, teamPercent: 20, kitchenPercent: 10 }, actor)).rejects.toThrow(/100/);
  });

  it("enregistre un pourboire individuel lié à un paiement POS", async () => {
    const { repo, service, actor } = setup();
    const tip = await service.recordTip("h1", { posPaymentId: "pp1", type: "INDIVIDUAL", amount: 500, method: "CASH", recipient: "serveur-1" }, actor);
    expect(tip.status).toBe("PENDING");
    expect(tip.amount).toBe(500);
    expect(repo.tips.get(tip.id)!.allocations.some((a) => a.recipient === "serveur-1" && a.amount === 500)).toBe(true);
  });

  it("enregistre un pourboire collectif et répartit selon la règle", async () => {
    const { repo, service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Standard", serverPercent: 60, teamPercent: 30, kitchenPercent: 10 }, actor);
    const tip = await service.recordTip("h1", { posPaymentId: "pp1", type: "COLLECTIVE", amount: 1000, method: "CARD", tipRuleId: rule.id }, actor);
    const allocs = repo.tips.get(tip.id)!.allocations;
    const server = allocs.find((a) => a.recipient === "server")!.amount;
    expect(server).toBe(600); // 60% de 1000
    expect(allocs.some((a) => a.recipient === "kitchen" && a.amount === 100)).toBe(true);
  });

  it("valide un pourboire par un responsable (PENDING→VALIDATED)", async () => {
    const { service, actor } = setup();
    const tip = await service.recordTip("h1", { type: "INDIVIDUAL", amount: 500, method: "CASH", recipient: "serveur-1" }, actor);
    const validated = await service.validate("h1", tip.id, actor);
    expect(validated.status).toBe("VALIDATED");
    expect(validated.validatedBy).toBe("u1");
  });

  it("distribue un pourboire validé (VALIDATED→DISTRIBUTED)", async () => {
    const { service, actor } = setup();
    const tip = await service.recordTip("h1", { type: "INDIVIDUAL", amount: 500, method: "MOBILE_MONEY", recipient: "serveur-1" }, actor);
    await service.validate("h1", tip.id, actor);
    const distributed = await service.distribute("h1", tip.id, actor);
    expect(distributed.status).toBe("DISTRIBUTED");
  });

  it("annule un pourboire avec traçabilité", async () => {
    const { repo, service, actor } = setup();
    const tip = await service.recordTip("h1", { type: "INDIVIDUAL", amount: 500, method: "CASH", recipient: "serveur-1" }, actor);
    const cancelled = await service.cancel("h1", tip.id, actor, "Erreur de saisie");
    expect(cancelled.status).toBe("CANCELLED");
    expect(repo.tips.get(tip.id)!.events).toContain("cancel");
  });

  it("rejette la validation d'un pourboire déjà distribué", async () => {
    const { service, actor } = setup();
    const tip = await service.recordTip("h1", { type: "INDIVIDUAL", amount: 500, method: "CASH", recipient: "serveur-1" }, actor);
    await service.validate("h1", tip.id, actor);
    await service.distribute("h1", tip.id, actor);
    await expect(service.validate("h1", tip.id, actor)).rejects.toThrow(/illégale/);
  });

  it("calcule le suivi des montants (en attente vs distribués)", async () => {
    const { service, actor } = setup();
    const t1 = await service.recordTip("h1", { type: "INDIVIDUAL", amount: 500, method: "CASH", recipient: "s1" }, actor);
    const t2 = await service.recordTip("h1", { type: "INDIVIDUAL", amount: 300, method: "CARD", recipient: "s2" }, actor);
    await service.validate("h1", t1.id, actor);
    await service.distribute("h1", t1.id, actor);
    const result = await service.listTips("h1", {}, actor);
    expect(result.total).toBe(2);
    expect(result.distributedTotal).toBe(500);
    expect(result.pendingTotal).toBe(300); // t2 encore PENDING
    void t2;
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: TipsActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createRule("h1", { name: "X" }, other)).rejects.toThrow(TipsError);
  });

  it("rejette un pourboire individuel sans bénéficiaire", async () => {
    const { service, actor } = setup();
    await expect(service.recordTip("h1", { type: "INDIVIDUAL", amount: 500, method: "CASH" }, actor)).rejects.toThrow(/bénéficiaire/);
  });

  it("rejette un pourboire collectif sans règle", async () => {
    const { service, actor } = setup();
    await expect(service.recordTip("h1", { type: "COLLECTIVE", amount: 1000, method: "CASH" }, actor)).rejects.toThrow(/règle/);
  });
});
