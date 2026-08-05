import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { LoyaltyService, type LoyaltyActor } from "./loyalty.service.js";
import { LoyaltyError } from "./loyalty.error.js";
import type { LoyaltyRepository } from "./loyalty.repository.js";
import type { MemberSummary } from "./loyalty.types.js";
import type {
  LoyaltyBonus, LoyaltyMember, LoyaltyNotification, LoyaltyProgram, LoyaltyRedemption,
  LoyaltyReward, LoyaltyRule, LoyaltyTier, LoyaltyTransaction, CreateProgramInput,
  CreateTierInput, CreateRuleInput, CreateRewardInput, CreateBonusInput,
} from "./loyalty.types.js";

let seq = 0;

class MemoryRepo implements LoyaltyRepository {
  programs: LoyaltyProgram[] = [];
  tiers: LoyaltyTier[] = [];
  rules: LoyaltyRule[] = [];
  rewards: LoyaltyReward[] = [];
  bonuses: LoyaltyBonus[] = [];
  members: LoyaltyMember[] = [];
  transactions: LoyaltyTransaction[] = [];
  redemptions: LoyaltyRedemption[] = [];
  notifications: LoyaltyNotification[] = [];
  guestIds = new Set<string>();
  guestNames = new Map<string, { firstName: string; lastName: string; email?: string | null }>();
  snapshots: Record<string, { points: number; tier: string }> = {};

  async createProgram(hotelId: string, organisationId: string, input: CreateProgramInput & { scope: "HOTEL" | "GROUP" }, participants: string[]): Promise<LoyaltyProgram> {
    const p: LoyaltyProgram = { id: `prog-${++seq}`, hotelId, organisationId, name: input.name, scope: input.scope, description: input.description ?? null, currency: input.currency ?? "XOF", pointsPerSpend: input.pointsPerSpend ?? 0, pointsPerNight: input.pointsPerNight ?? 0, validityDays: input.validityDays ?? 365, isActive: true, startDate: input.startDate ? new Date(input.startDate) : null, endDate: input.endDate ? new Date(input.endDate) : null, config: input.config ?? null };
    this.programs.push(p);
    return p;
  }
  async listPrograms(hotelId: string): Promise<LoyaltyProgram[]> { return this.programs.filter((p) => p.hotelId === hotelId); }
  async getProgram(hotelId: string, programId: string): Promise<LoyaltyProgram | null> { return this.programs.find((p) => p.id === programId && p.hotelId === hotelId) ?? null; }
  async programInHotel(hotelId: string, programId: string): Promise<boolean> { return !!this.programs.find((p) => p.id === programId && p.hotelId === hotelId); }
  async setProgramActive(hotelId: string, programId: string, isActive: boolean): Promise<void> { const p = this.programs.find((x) => x.id === programId)!; p.isActive = isActive; }

  async createTier(hotelId: string, programId: string, input: CreateTierInput): Promise<LoyaltyTier> {
    const t: LoyaltyTier = { id: `tier-${++seq}`, programId, hotelId, code: input.code, name: input.name, rank: input.rank ?? 0, minPoints: input.minPoints ?? 0, minStays: input.minStays ?? 0, minSpend: input.minSpend ?? 0, benefits: input.benefits ?? null, accessRules: input.accessRules ?? null, keepRules: input.keepRules ?? null, isActive: true };
    this.tiers.push(t); return t;
  }
  async listTiers(hotelId: string, programId: string): Promise<LoyaltyTier[]> { return this.tiers.filter((t) => t.programId === programId); }
  async setTierActive(hotelId: string, tierId: string, isActive: boolean): Promise<void> { const t = this.tiers.find((x) => x.id === tierId)!; t.isActive = isActive; }

  async createRule(hotelId: string, programId: string, input: CreateRuleInput): Promise<LoyaltyRule> {
    const r: LoyaltyRule = { id: `rule-${++seq}`, programId, hotelId, name: input.name, trigger: input.trigger, condition: input.condition ?? null, points: input.points ?? 0, pointsPerUnit: input.pointsPerUnit ?? 0, multiplier: input.multiplier ?? 1, capPerEvent: input.capPerEvent ?? null, priority: input.priority ?? 100, isActive: true };
    this.rules.push(r); return r;
  }
  async listRules(hotelId: string, programId: string): Promise<LoyaltyRule[]> { return this.rules.filter((r) => r.programId === programId); }
  async setRuleActive(hotelId: string, ruleId: string, isActive: boolean): Promise<void> { const r = this.rules.find((x) => x.id === ruleId)!; r.isActive = isActive; }

  async createReward(hotelId: string, programId: string, input: CreateRewardInput): Promise<LoyaltyReward> {
    const rw: LoyaltyReward = { id: `rew-${++seq}`, programId, hotelId, name: input.name, type: input.type, pointsCost: input.pointsCost, value: input.value ?? 0, description: input.description ?? null, config: input.config ?? null, validityDays: input.validityDays ?? 365, stock: input.stock ?? null, isActive: true };
    this.rewards.push(rw); return rw;
  }
  async listRewards(hotelId: string, programId: string): Promise<LoyaltyReward[]> { return this.rewards.filter((r) => r.programId === programId); }
  async setRewardActive(hotelId: string, rewardId: string, isActive: boolean): Promise<void> { const r = this.rewards.find((x) => x.id === rewardId)!; r.isActive = isActive; }

  async createBonus(hotelId: string, programId: string, input: CreateBonusInput): Promise<LoyaltyBonus> {
    const b: LoyaltyBonus = { id: `bonus-${++seq}`, programId, hotelId, name: input.name, bonusType: input.bonusType, points: input.points, condition: input.condition ?? null, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, isActive: true };
    this.bonuses.push(b); return b;
  }
  async listBonuses(hotelId: string, programId: string): Promise<LoyaltyBonus[]> { return this.bonuses.filter((b) => b.programId === programId); }
  async setBonusActive(hotelId: string, bonusId: string, isActive: boolean): Promise<void> { const b = this.bonuses.find((x) => x.id === bonusId)!; b.isActive = isActive; }

  async enroll(hotelId: string, programId: string, guestId: string, tierId?: string): Promise<LoyaltyMember> {
    const m: LoyaltyMember = { id: `mem-${++seq}`, programId, hotelId, guestId, tierId: tierId ?? null, pointsBalance: 0, lifetimePoints: 0, joinedAt: new Date(), lastEarnAt: null, expiresAt: null, status: "ACTIVE" };
    this.members.push(m); return m;
  }
  async getMemberByGuest(hotelId: string, programId: string, guestId: string): Promise<LoyaltyMember | null> { return this.members.find((m) => m.programId === programId && m.guestId === guestId && m.hotelId === hotelId) ?? null; }
  async getMember(hotelId: string, memberId: string): Promise<LoyaltyMember | null> { return this.members.find((m) => m.id === memberId && m.hotelId === hotelId) ?? null; }
  async listMembers(hotelId: string, programId?: string): Promise<LoyaltyMember[]> { return this.members.filter((m) => m.hotelId === hotelId && (programId ? m.programId === programId : true)); }
  async setMemberStatus(hotelId: string, memberId: string, status: string): Promise<void> { const m = this.members.find((x) => x.id === memberId)!; m.status = status as LoyaltyMember["status"]; }
  async updateMemberPoints(hotelId: string, memberId: string, delta: number, tierId?: string): Promise<LoyaltyMember> {
    const m = this.members.find((x) => x.id === memberId)!;
    m.pointsBalance += delta;
    if (delta > 0) { m.lifetimePoints += delta; m.lastEarnAt = new Date(); }
    if (tierId) m.tierId = tierId;
    return m;
  }
  async recordTransaction(hotelId: string, tx: Omit<LoyaltyTransaction, "id" | "createdAt">): Promise<LoyaltyTransaction> {
    const t: LoyaltyTransaction = { ...tx, id: `tx-${++seq}`, createdAt: new Date() };
    this.transactions.push(t); return t;
  }
  async listTransactions(hotelId: string, memberId: string): Promise<LoyaltyTransaction[]> { return this.transactions.filter((t) => t.memberId === memberId); }
  async hasEarned(hotelId: string, guestId: string, ruleId: string, reference: string): Promise<boolean> { return this.transactions.some((t) => t.guestId === guestId && t.ruleId === ruleId && t.reference === reference); }

  async createRedemption(hotelId: string, input: { memberId: string; rewardId: string; programId: string; guestId: string; points: number; reference?: string | null; metadata?: Record<string, unknown> | null }): Promise<LoyaltyRedemption> {
    const r: LoyaltyRedemption = { id: `rd-${++seq}`, memberId: input.memberId, rewardId: input.rewardId, programId: input.programId, hotelId, guestId: input.guestId, points: input.points, status: "PENDING", reference: input.reference ?? null, metadata: input.metadata ?? null, redeemedAt: new Date(), confirmedAt: null, expiresAt: null };
    this.redemptions.push(r); return r;
  }
  async listRedemptions(hotelId: string, memberId: string): Promise<LoyaltyRedemption[]> { return this.redemptions.filter((r) => r.memberId === memberId); }
  async getRedemption(hotelId: string, redemptionId: string): Promise<LoyaltyRedemption | null> { return this.redemptions.find((r) => r.id === redemptionId && r.hotelId === hotelId) ?? null; }
  async setRedemptionStatus(hotelId: string, redemptionId: string, status: string, confirmedAt?: Date): Promise<void> { const r = this.redemptions.find((x) => x.id === redemptionId)!; r.status = status as LoyaltyRedemption["status"]; if (confirmedAt) r.confirmedAt = confirmedAt; }

  async createNotification(hotelId: string, input: { memberId: string; guestId: string; type: string; title: string; body?: string | null }): Promise<LoyaltyNotification> {
    const n: LoyaltyNotification = { id: `n-${++seq}`, memberId: input.memberId, guestId: input.guestId, hotelId, type: input.type as LoyaltyNotification["type"], title: input.title, body: input.body ?? null, read: false, createdAt: new Date() };
    this.notifications.push(n); return n;
  }
  async listNotifications(hotelId: string, memberId: string): Promise<LoyaltyNotification[]> { return this.notifications.filter((n) => n.memberId === memberId); }
  async markNotificationsRead(hotelId: string, memberId: string): Promise<void> { this.notifications.forEach((n) => { if (n.memberId === memberId) n.read = true; }); }

  async getMemberSummary(hotelId: string, memberId: string): Promise<MemberSummary | null> {
    const m = this.members.find((x) => x.id === memberId && x.hotelId === hotelId); if (!m) return null;
    const g = this.guestNames.get(m.guestId);
    const tier = this.tiers.find((t) => t.id === m.tierId);
    return { member: m, guestName: g ? `${g.firstName} ${g.lastName}` : "Client", guestEmail: g?.email ?? null, tierName: tier?.name ?? null, tierCode: tier?.code ?? null, pointsBalance: m.pointsBalance, lifetimePoints: m.lifetimePoints, redeemable: this.rewards.filter((r) => r.pointsCost <= m.pointsBalance && r.isActive), transactions: this.transactions.filter((t) => t.memberId === memberId), notifications: this.notifications.filter((n) => n.memberId === memberId) };
  }
  async updateGuestSnapshot(hotelId: string, guestId: string, points: number, tier: string): Promise<void> { this.snapshots[guestId] = { points, tier }; }
  async guestExists(hotelId: string, guestId: string): Promise<boolean> { return this.guestIds.has(guestId); }
  async getGuestName(hotelId: string, guestId: string): Promise<{ firstName: string; lastName: string; email?: string | null } | null> { return this.guestNames.get(guestId) ?? null; }
}

const actorH1: LoyaltyActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };
const actorH2: LoyaltyActor = { organisationId: "org1", hotelId: "h2", actorUserId: "u2" };

function build() {
  const repo = new MemoryRepo();
  repo.guestIds.add("g1");
  repo.guestIds.add("g2");
  repo.guestNames.set("g1", { firstName: "Awa", lastName: "Diallo", email: "awa@demo.bj" });
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new LoyaltyService(repo, audit, bus);
  return { repo, svc, audit, bus };
}

describe("loyalty.service", () => {
  let r: { repo: MemoryRepo; svc: LoyaltyService; audit: AuditLogger; bus: EventBus };

  beforeEach(() => { seq = 0; r = build(); });

  it("crée un programme et un niveau", async () => {
    const p = await r.svc.createProgram("h1", { name: "AfriPoints", scope: "HOTEL", pointsPerNight: 100, currency: "XOF" }, actorH1);
    expect(p.id).toBeTruthy();
    expect(p.isActive).toBe(true);
    const tier = await r.svc.createTier("h1", p.id, { code: "GOLD", name: "Or", rank: 2, minPoints: 1000, benefits: { lateCheckout: true } }, actorH1);
    expect(tier.code).toBe("GOLD");
  });

  it("crée une règle paramétrable", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    const rule = await r.svc.createRule("h1", p.id, { name: "1 pt par XOF", trigger: "spend_earned", pointsPerUnit: 1 }, actorH1);
    expect(rule.trigger).toBe("spend_earned");
  });

  it("rejette un accès inter-hôtel", async () => {
    await expect(r.svc.createProgram("h2", { name: "X" }, actorH1)).rejects.toThrow(LoyaltyError);
  });

  it("enrôle un client", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    const m = await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    expect(m.status).toBe("ACTIVE");
    expect(m.tierId).toBeTruthy();
    expect(r.repo.snapshots.g1!.tier).toBe("BRONZE");
  });

  it("attribue des points via le moteur de règles et monte de niveau", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "GOLD", name: "Or", rank: 2, minPoints: 1500 }, actorH1);
    await r.svc.createRule("h1", p.id, { name: "1pt/XOF", trigger: "spend_earned", pointsPerUnit: 1 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);

    const txs = await r.svc.awardPoints("h1", { guestId: "g1", trigger: "spend_earned", context: { amount: 2000 }, reference: "inv-1", sourceModule: "billing" }, actorH1);
    expect(txs).toHaveLength(1);
    expect(txs[0]!.points).toBe(2000);
    expect(txs[0]!.balanceAfter).toBe(2000);
    const m = (await r.svc.listMembers("h1", p.id, actorH1))[0]!;
    expect(m.pointsBalance).toBe(2000);
    // atteint Or (>=1500)
    expect(r.repo.snapshots.g1!.tier).toBe("GOLD");
    // notification créée
    expect(r.repo.notifications.some((n) => n.title.includes("2000 points"))).toBe(true);
  });

  it("garantit l'idempotence par référence", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.createRule("h1", p.id, { name: "bonus bienvenue", trigger: "welcome", points: 100 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    await r.svc.awardPoints("h1", { guestId: "g1", trigger: "welcome", reference: "welcome-1" }, actorH1);
    const second = await r.svc.awardPoints("h1", { guestId: "g1", trigger: "welcome", reference: "welcome-1" }, actorH1);
    expect(second).toHaveLength(0); // rejoué => ignoré
    const m = (await r.svc.listMembers("h1", p.id, actorH1))[0]!;
    expect(m.pointsBalance).toBe(100);
  });

  it("échoue si solde insuffisant lors d'un échange", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    const rew = await r.svc.createReward("h1", p.id, { name: "Nuit gratuite", type: "FREE_NIGHT", pointsCost: 5000 }, actorH1);
    await expect(r.svc.redeem("h1", { guestId: "g1", rewardId: rew.id }, actorH1)).rejects.toThrow("insuffisant");
  });

  it("échange des points contre une récompense", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.createRule("h1", p.id, { name: "1pt/XOF", trigger: "spend_earned", pointsPerUnit: 1 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    await r.svc.awardPoints("h1", { guestId: "g1", trigger: "spend_earned", context: { amount: 10000 }, reference: "inv-9", sourceModule: "billing" }, actorH1);
    const rew = await r.svc.createReward("h1", p.id, { name: "Réduction 10%", type: "DISCOUNT", pointsCost: 2000, value: 5000 }, actorH1);
    const rd = await r.svc.redeem("h1", { guestId: "g1", rewardId: rew.id }, actorH1);
    expect(rd.points).toBe(2000);
    const m = (await r.svc.listMembers("h1", p.id, actorH1))[0]!;
    expect(m.pointsBalance).toBe(8000);
    const txs = await r.svc.getTransactions("h1", m.id, actorH1);
    expect(txs.filter((t) => t.type === "REDEEM")).toHaveLength(1);
  });

  it("ajuste manuellement les points", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    const tx = await r.svc.adjustPoints("h1", { guestId: "g1", points: 250, reason: "Compensation", reference: "adj-1" }, actorH1);
    expect(tx.type).toBe("ADJUST");
    const m = (await r.svc.listMembers("h1", p.id, actorH1))[0]!;
    expect(m.pointsBalance).toBe(250);
    await expect(r.svc.adjustPoints("h1", { guestId: "g1", points: -500, reason: "Erreur" }, actorH1)).rejects.toThrow("négatif");
  });

  it("fournit la synthèse membre (solde, niveau, récompenses échangeables)", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.createRule("h1", p.id, { name: "1pt/XOF", trigger: "spend_earned", pointsPerUnit: 1 }, actorH1);
    await r.svc.createReward("h1", p.id, { name: "Boisson offerte", type: "SERVICE", pointsCost: 500 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    await r.svc.awardPoints("h1", { guestId: "g1", trigger: "spend_earned", context: { amount: 1000 }, reference: "inv-3", sourceModule: "billing" }, actorH1);
    const m = (await r.svc.listMembers("h1", p.id, actorH1))[0]!;
    const s = await r.svc.getMemberSummary("h1", m.id, actorH1);
    expect(s.guestName).toBe("Awa Diallo");
    expect(s.pointsBalance).toBe(1000);
    expect(s.redeemable).toHaveLength(1); // la boisson (500) est échangeable
  });

  it("confirme et annule un échange avec restitution", async () => {
    const p = await r.svc.createProgram("h1", { name: "P" }, actorH1);
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.createRule("h1", p.id, { name: "1pt/XOF", trigger: "spend_earned", pointsPerUnit: 1 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g1", programId: p.id }, actorH1);
    await r.svc.awardPoints("h1", { guestId: "g1", trigger: "spend_earned", context: { amount: 3000 }, reference: "inv-7", sourceModule: "billing" }, actorH1);
    const rew = await r.svc.createReward("h1", p.id, { name: "Upgrade suite", type: "UPGRADE", pointsCost: 1000 }, actorH1);
    const rd = await r.svc.redeem("h1", { guestId: "g1", rewardId: rew.id }, actorH1);
    await r.svc.confirmRedemption("h1", rd.id, actorH1);
    expect(r.repo.redemptions.find((x) => x.id === rd.id)!.status).toBe("CONFIRMED");
    await r.svc.cancelRedemption("h1", rd.id, actorH1);
    expect(r.repo.redemptions.find((x) => x.id === rd.id)!.status).toBe("CANCELLED");
    const m = (await r.svc.listMembers("h1", p.id, actorH1))[0]!;
    expect(m.pointsBalance).toBe(3000); // restitution
  });

  it("crée un programme groupe d'hôtels et attribue des points", async () => {
    const p = await r.svc.createProgram("h1", { name: "Groupe Points", scope: "GROUP", hotelIds: ["h1", "h2"] }, actorH1);
    expect(p.scope).toBe("GROUP");
    await r.svc.createTier("h1", p.id, { code: "BRONZE", name: "Bronze", rank: 1, minPoints: 0 }, actorH1);
    await r.svc.createRule("h1", p.id, { name: "100 pts/nuit", trigger: "night_earned", pointsPerUnit: 100 }, actorH1);
    await r.svc.enroll("h1", { guestId: "g2", programId: p.id }, actorH1);
    const txs = await r.svc.awardPoints("h1", { guestId: "g2", trigger: "night_earned", context: { nights: 2 }, reference: "stay-1", sourceModule: "reservations" }, actorH1);
    expect(txs[0]!.points).toBe(200);
  });
});
