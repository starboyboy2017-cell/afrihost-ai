/**
 * Module 22 — Programme de fidélité : adapter Prisma.
 */
import type {
  LoyaltyRepository,
  MemberSummary,
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyRule,
  LoyaltyReward,
  LoyaltyBonus,
  LoyaltyMember,
  LoyaltyRedemption,
  LoyaltyTransaction,
  LoyaltyNotification,
  CreateProgramInput,
  CreateTierInput,
  CreateRuleInput,
  CreateRewardInput,
  CreateBonusInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue | undefined => v as Prisma.InputJsonValue;

export class PrismaLoyaltyRepository implements LoyaltyRepository {
  // -------------------------------------------------------------------------
  // Programmes
  // -------------------------------------------------------------------------
  async createProgram(hotelId: string, organisationId: string, input: CreateProgramInput & { scope: "HOTEL" | "GROUP" }, participants: string[]): Promise<LoyaltyProgram> {
    const p = await prisma.$transaction(async (tx) => {
      const program = await tx.loyaltyProgram.create({
        data: {
          hotelId, organisationId, name: input.name, scope: input.scope,
          description: input.description ?? null, currency: input.currency ?? "XOF",
          pointsPerSpend: new Prisma.Decimal(input.pointsPerSpend ?? 0),
          pointsPerNight: input.pointsPerNight ?? 0, validityDays: input.validityDays ?? 365,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          config: input.config ? json(input.config) : undefined,
        },
      });
      await tx.loyaltyProgramHotel.createMany({
        data: [...new Set(participants)].map((h) => ({ programId: program.id, hotelId: h })),
      });
      return program;
    });
    return {
      id: p.id, hotelId: p.hotelId, organisationId: p.organisationId, name: p.name,
      scope: p.scope as LoyaltyProgram["scope"], description: p.description, currency: p.currency,
      pointsPerSpend: p.pointsPerSpend.toNumber(), pointsPerNight: p.pointsPerNight,
      validityDays: p.validityDays, isActive: p.isActive, startDate: p.startDate, endDate: p.endDate,
      config: p.config as Record<string, unknown> | null,
    };
  }
  async listPrograms(hotelId: string, organisationId: string): Promise<LoyaltyProgram[]> {
    const rows = await prisma.loyaltyProgram.findMany({ where: { organisationId } });
    return rows.map((p) => ({
      id: p.id, hotelId: p.hotelId, organisationId: p.organisationId, name: p.name,
      scope: p.scope as LoyaltyProgram["scope"], description: p.description, currency: p.currency,
      pointsPerSpend: p.pointsPerSpend.toNumber(), pointsPerNight: p.pointsPerNight,
      validityDays: p.validityDays, isActive: p.isActive, startDate: p.startDate, endDate: p.endDate,
      config: p.config as Record<string, unknown> | null,
    }));
  }
  async getProgram(hotelId: string, programId: string): Promise<LoyaltyProgram | null> {
    const p = await prisma.loyaltyProgram.findFirst({ where: { id: programId, hotelId } });
    return p ? {
      id: p.id, hotelId: p.hotelId, organisationId: p.organisationId, name: p.name,
      scope: p.scope as LoyaltyProgram["scope"], description: p.description, currency: p.currency,
      pointsPerSpend: p.pointsPerSpend.toNumber(), pointsPerNight: p.pointsPerNight,
      validityDays: p.validityDays, isActive: p.isActive, startDate: p.startDate, endDate: p.endDate,
      config: p.config as Record<string, unknown> | null,
    } : null;
  }
  async programInHotel(hotelId: string, programId: string): Promise<boolean> {
    const link = await prisma.loyaltyProgramHotel.findFirst({ where: { programId, hotelId } });
    return link !== null;
  }
  async setProgramActive(hotelId: string, programId: string, isActive: boolean): Promise<void> {
    await prisma.loyaltyProgram.update({ where: { id: programId, hotelId }, data: { isActive } });
  }

  // -------------------------------------------------------------------------
  // Niveaux
  // -------------------------------------------------------------------------
  async createTier(hotelId: string, programId: string, input: CreateTierInput): Promise<LoyaltyTier> {
    const t = await prisma.loyaltyTier.create({ data: {
      programId, hotelId, code: input.code, name: input.name, rank: input.rank ?? 0,
      minPoints: input.minPoints ?? 0, minStays: input.minStays ?? 0,
      minSpend: new Prisma.Decimal(input.minSpend ?? 0),
      benefits: input.benefits ? json(input.benefits) : undefined,
      accessRules: input.accessRules ? json(input.accessRules) : undefined,
      keepRules: input.keepRules ? json(input.keepRules) : undefined,
    } });
    return { id: t.id, programId: t.programId, hotelId: t.hotelId, code: t.code, name: t.name, rank: t.rank, minPoints: t.minPoints, minStays: t.minStays, minSpend: t.minSpend.toNumber(), benefits: t.benefits as Record<string, unknown> | null, accessRules: t.accessRules as Record<string, unknown> | null, keepRules: t.keepRules as Record<string, unknown> | null, isActive: t.isActive };
  }
  async listTiers(hotelId: string, programId: string): Promise<LoyaltyTier[]> {
    const rows = await prisma.loyaltyTier.findMany({ where: { programId }, orderBy: { rank: "asc" } });
    return rows.map((t) => ({ id: t.id, programId: t.programId, hotelId: t.hotelId, code: t.code, name: t.name, rank: t.rank, minPoints: t.minPoints, minStays: t.minStays, minSpend: t.minSpend.toNumber(), benefits: t.benefits as Record<string, unknown> | null, accessRules: t.accessRules as Record<string, unknown> | null, keepRules: t.keepRules as Record<string, unknown> | null, isActive: t.isActive }));
  }
  async setTierActive(hotelId: string, tierId: string, isActive: boolean): Promise<void> {
    await prisma.loyaltyTier.update({ where: { id: tierId }, data: { isActive } });
  }

  // -------------------------------------------------------------------------
  // Règles
  // -------------------------------------------------------------------------
  async createRule(hotelId: string, programId: string, input: CreateRuleInput): Promise<LoyaltyRule> {
    const r = await prisma.loyaltyRule.create({ data: {
      programId, hotelId, name: input.name, trigger: input.trigger,
      condition: input.condition ? json(input.condition) : undefined,
      points: input.points ?? 0, pointsPerUnit: new Prisma.Decimal(input.pointsPerUnit ?? 0),
      multiplier: new Prisma.Decimal(input.multiplier ?? 1), capPerEvent: input.capPerEvent ?? null,
      priority: input.priority ?? 100,
    } });
    return { id: r.id, programId: r.programId, hotelId: r.hotelId, name: r.name, trigger: r.trigger, condition: r.condition as Record<string, unknown> | null, points: r.points, pointsPerUnit: r.pointsPerUnit.toNumber(), multiplier: r.multiplier.toNumber(), capPerEvent: r.capPerEvent, priority: r.priority, isActive: r.isActive };
  }
  async listRules(hotelId: string, programId: string): Promise<LoyaltyRule[]> {
    const rows = await prisma.loyaltyRule.findMany({ where: { programId }, orderBy: { priority: "asc" } });
    return rows.map((r) => ({ id: r.id, programId: r.programId, hotelId: r.hotelId, name: r.name, trigger: r.trigger, condition: r.condition as Record<string, unknown> | null, points: r.points, pointsPerUnit: r.pointsPerUnit.toNumber(), multiplier: r.multiplier.toNumber(), capPerEvent: r.capPerEvent, priority: r.priority, isActive: r.isActive }));
  }
  async setRuleActive(hotelId: string, ruleId: string, isActive: boolean): Promise<void> {
    await prisma.loyaltyRule.update({ where: { id: ruleId }, data: { isActive } });
  }

  // -------------------------------------------------------------------------
  // Récompenses
  // -------------------------------------------------------------------------
  async createReward(hotelId: string, programId: string, input: CreateRewardInput): Promise<LoyaltyReward> {
    const r = await prisma.loyaltyReward.create({ data: {
      programId, hotelId, name: input.name, type: input.type, pointsCost: input.pointsCost,
      value: new Prisma.Decimal(input.value ?? 0), description: input.description ?? null,
      config: input.config ? json(input.config) : undefined, validityDays: input.validityDays ?? 365,
      stock: input.stock ?? null,
    } });
    return { id: r.id, programId: r.programId, hotelId: r.hotelId, name: r.name, type: r.type as LoyaltyReward["type"], pointsCost: r.pointsCost, value: r.value.toNumber(), description: r.description, config: r.config as Record<string, unknown> | null, validityDays: r.validityDays, stock: r.stock, isActive: r.isActive };
  }
  async listRewards(hotelId: string, programId: string): Promise<LoyaltyReward[]> {
    const rows = await prisma.loyaltyReward.findMany({ where: { programId }, orderBy: { pointsCost: "asc" } });
    return rows.map((r) => ({ id: r.id, programId: r.programId, hotelId: r.hotelId, name: r.name, type: r.type as LoyaltyReward["type"], pointsCost: r.pointsCost, value: r.value.toNumber(), description: r.description, config: r.config as Record<string, unknown> | null, validityDays: r.validityDays, stock: r.stock, isActive: r.isActive }));
  }
  async setRewardActive(hotelId: string, rewardId: string, isActive: boolean): Promise<void> {
    await prisma.loyaltyReward.update({ where: { id: rewardId }, data: { isActive } });
  }

  // -------------------------------------------------------------------------
  // Bonus
  // -------------------------------------------------------------------------
  async createBonus(hotelId: string, programId: string, input: CreateBonusInput): Promise<LoyaltyBonus> {
    const b = await prisma.loyaltyBonus.create({ data: {
      programId, hotelId, name: input.name, bonusType: input.bonusType, points: input.points,
      condition: input.condition ? json(input.condition) : undefined,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    } });
    return { id: b.id, programId: b.programId, hotelId: b.hotelId, name: b.name, bonusType: b.bonusType as LoyaltyBonus["bonusType"], points: b.points, condition: b.condition as Record<string, unknown> | null, startsAt: b.startsAt, endsAt: b.endsAt, isActive: b.isActive };
  }
  async listBonuses(hotelId: string, programId: string): Promise<LoyaltyBonus[]> {
    const rows = await prisma.loyaltyBonus.findMany({ where: { programId } });
    return rows.map((b) => ({ id: b.id, programId: b.programId, hotelId: b.hotelId, name: b.name, bonusType: b.bonusType as LoyaltyBonus["bonusType"], points: b.points, condition: b.condition as Record<string, unknown> | null, startsAt: b.startsAt, endsAt: b.endsAt, isActive: b.isActive }));
  }
  async setBonusActive(hotelId: string, bonusId: string, isActive: boolean): Promise<void> {
    await prisma.loyaltyBonus.update({ where: { id: bonusId }, data: { isActive } });
  }

  // -------------------------------------------------------------------------
  // Adhésions
  // -------------------------------------------------------------------------
  async enroll(hotelId: string, programId: string, guestId: string, tierId?: string): Promise<LoyaltyMember> {
    const m = await prisma.loyaltyMember.create({ data: { programId, hotelId, guestId, tierId: tierId ?? null } });
    return this.mapMember(m);
  }
  async getMemberByGuest(hotelId: string, programId: string, guestId: string): Promise<LoyaltyMember | null> {
    const m = await prisma.loyaltyMember.findFirst({ where: { programId, guestId, hotelId } });
    return m ? this.mapMember(m) : null;
  }
  async getMember(hotelId: string, memberId: string): Promise<LoyaltyMember | null> {
    const m = await prisma.loyaltyMember.findFirst({ where: { id: memberId, hotelId } });
    return m ? this.mapMember(m) : null;
  }
  async listMembers(hotelId: string, programId?: string): Promise<LoyaltyMember[]> {
    const rows = await prisma.loyaltyMember.findMany({ where: { hotelId, ...(programId ? { programId } : {}) }, orderBy: { joinedAt: "desc" } });
    return rows.map((m) => this.mapMember(m));
  }
  async setMemberStatus(hotelId: string, memberId: string, status: string): Promise<void> {
    await prisma.loyaltyMember.update({ where: { id: memberId, hotelId }, data: { status } });
  }
  async updateMemberPoints(hotelId: string, memberId: string, delta: number, tierId?: string): Promise<LoyaltyMember> {
    const m = await prisma.loyaltyMember.findFirst({ where: { id: memberId, hotelId } });
    if (!m) throw new Error("Adhésion introuvable");
    const updated = await prisma.loyaltyMember.update({
      where: { id: memberId },
      data: {
        pointsBalance: m.pointsBalance + delta,
        lifetimePoints: delta > 0 ? m.lifetimePoints + delta : m.lifetimePoints,
        lastEarnAt: delta > 0 ? new Date() : m.lastEarnAt,
        ...(tierId ? { tierId } : {}),
      },
    });
    return this.mapMember(updated);
  }

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------
  async recordTransaction(hotelId: string, tx: Omit<LoyaltyTransaction, "id" | "createdAt">): Promise<LoyaltyTransaction> {
    const t = await prisma.loyaltyTransaction.create({
      data: {
        guestId: tx.guestId, memberId: tx.memberId ?? null, programId: tx.programId ?? null,
        ruleId: tx.ruleId ?? null, rewardId: tx.rewardId ?? null, hotelId,
        type: tx.type, points: tx.points, balanceAfter: tx.balanceAfter ?? null,
        reference: tx.reference ?? null, description: tx.description ?? null,
        sourceModule: tx.sourceModule ?? null,
      },
    });
    return this.mapTx(t);
  }
  async listTransactions(hotelId: string, memberId: string): Promise<LoyaltyTransaction[]> {
    const rows = await prisma.loyaltyTransaction.findMany({ where: { memberId, hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map((t) => this.mapTx(t));
  }
  async hasEarned(hotelId: string, guestId: string, ruleId: string, reference: string): Promise<boolean> {
    const found = await prisma.loyaltyTransaction.findFirst({ where: { guestId, ruleId, reference } });
    return found !== null;
  }

  // -------------------------------------------------------------------------
  // Échanges
  // -------------------------------------------------------------------------
  async createRedemption(hotelId: string, input: { memberId: string; rewardId: string; programId: string; guestId: string; points: number; reference?: string | null; metadata?: Record<string, unknown> | null }): Promise<LoyaltyRedemption> {
    const r = await prisma.loyaltyRedemption.create({ data: {
      memberId: input.memberId, rewardId: input.rewardId, programId: input.programId,
      hotelId, guestId: input.guestId, points: input.points, reference: input.reference ?? null,
      metadata: input.metadata ? json(input.metadata) : undefined,
    } });
    return this.mapRedemption(r);
  }
  async listRedemptions(hotelId: string, memberId: string): Promise<LoyaltyRedemption[]> {
    const rows = await prisma.loyaltyRedemption.findMany({ where: { memberId, hotelId }, orderBy: { redeemedAt: "desc" } });
    return rows.map((r) => this.mapRedemption(r));
  }
  async getRedemption(hotelId: string, redemptionId: string): Promise<LoyaltyRedemption | null> {
    const r = await prisma.loyaltyRedemption.findFirst({ where: { id: redemptionId, hotelId } });
    return r ? this.mapRedemption(r) : null;
  }
  async setRedemptionStatus(hotelId: string, redemptionId: string, status: string, confirmedAt?: Date): Promise<void> {
    await prisma.loyaltyRedemption.update({ where: { id: redemptionId }, data: { status, ...(confirmedAt ? { confirmedAt } : {}) } });
  }

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  async createNotification(hotelId: string, input: { memberId: string; guestId: string; type: string; title: string; body?: string | null }): Promise<LoyaltyNotification> {
    const n = await prisma.loyaltyNotification.create({ data: { memberId: input.memberId, guestId: input.guestId, hotelId, type: input.type as import("@prisma/client").$Enums.LoyaltyNotificationType, title: input.title, body: input.body ?? null } });
    return { id: n.id, memberId: n.memberId, guestId: n.guestId, hotelId: n.hotelId, type: n.type as LoyaltyNotification["type"], title: n.title, body: n.body, read: n.read, createdAt: n.createdAt };
  }
  async listNotifications(hotelId: string, memberId: string): Promise<LoyaltyNotification[]> {
    const rows = await prisma.loyaltyNotification.findMany({ where: { memberId, hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map((n) => ({ id: n.id, memberId: n.memberId, guestId: n.guestId, hotelId: n.hotelId, type: n.type as LoyaltyNotification["type"], title: n.title, body: n.body, read: n.read, createdAt: n.createdAt }));
  }
  async markNotificationsRead(hotelId: string, memberId: string): Promise<void> {
    await prisma.loyaltyNotification.updateMany({ where: { memberId, hotelId }, data: { read: true } });
  }

  // -------------------------------------------------------------------------
  // Synthèse / intégration
  // -------------------------------------------------------------------------
  async getMemberSummary(hotelId: string, memberId: string): Promise<MemberSummary | null> {
    const m = await prisma.loyaltyMember.findFirst({
      where: { id: memberId, hotelId },
      include: { guest: { select: { firstName: true, lastName: true, email: true } }, tier: true, program: { include: { rewards: { where: { isActive: true } } } } },
    });
    if (!m) return null;
    const transactions = await prisma.loyaltyTransaction.findMany({ where: { memberId, hotelId }, orderBy: { createdAt: "desc" }, take: 50 });
    const notifications = await prisma.loyaltyNotification.findMany({ where: { memberId, hotelId }, orderBy: { createdAt: "desc" }, take: 20 });
    const redeemable = m.program.rewards.filter((r) => r.pointsCost <= m.pointsBalance).map((r) => ({ id: r.id, programId: r.programId, hotelId: r.hotelId, name: r.name, type: r.type as LoyaltyReward["type"], pointsCost: r.pointsCost, value: r.value.toNumber(), description: r.description, config: r.config as Record<string, unknown> | null, validityDays: r.validityDays, stock: r.stock, isActive: r.isActive }));
    return {
      member: this.mapMember(m), guestName: `${m.guest.firstName} ${m.guest.lastName}`,
      guestEmail: m.guest.email, tierName: m.tier?.name ?? null, tierCode: m.tier?.code ?? null,
      pointsBalance: m.pointsBalance, lifetimePoints: m.lifetimePoints,
      redeemable, transactions: transactions.map((t) => this.mapTx(t)), notifications: notifications.map((n) => ({ id: n.id, memberId: n.memberId, guestId: n.guestId, hotelId: n.hotelId, type: n.type as LoyaltyNotification["type"], title: n.title, body: n.body, read: n.read, createdAt: n.createdAt })),
    };
  }
  async updateGuestSnapshot(hotelId: string, guestId: string, points: number, tier: string): Promise<void> {
    await prisma.guest.update({ where: { id: guestId }, data: { loyaltyPoints: points, loyaltyTier: tier } });
  }
  async guestExists(hotelId: string, guestId: string): Promise<boolean> {
    const g = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return g !== null;
  }
  async getGuestName(hotelId: string, guestId: string): Promise<{ firstName: string; lastName: string; email?: string | null } | null> {
    const g = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return g ? { firstName: g.firstName, lastName: g.lastName, email: g.email } : null;
  }

  private mapMember(m: { id: string; programId: string; hotelId: string; guestId: string; tierId: string | null; pointsBalance: number; lifetimePoints: number; joinedAt: Date; lastEarnAt: Date | null; expiresAt: Date | null; status: string }): LoyaltyMember {
    return { id: m.id, programId: m.programId, hotelId: m.hotelId, guestId: m.guestId, tierId: m.tierId, pointsBalance: m.pointsBalance, lifetimePoints: m.lifetimePoints, joinedAt: m.joinedAt, lastEarnAt: m.lastEarnAt, expiresAt: m.expiresAt, status: m.status as LoyaltyMember["status"] };
  }
  private mapTx(t: { id: string; guestId: string; memberId: string | null; programId: string | null; ruleId: string | null; rewardId: string | null; hotelId: string; type: string; points: number; balanceAfter: number | null; reference: string | null; description: string | null; sourceModule: string | null; createdAt: Date }): LoyaltyTransaction {
    return { id: t.id, guestId: t.guestId, memberId: t.memberId, programId: t.programId, ruleId: t.ruleId, rewardId: t.rewardId, hotelId: t.hotelId, type: t.type as LoyaltyTransaction["type"], points: t.points, balanceAfter: t.balanceAfter, reference: t.reference, description: t.description, sourceModule: t.sourceModule, createdAt: t.createdAt };
  }
  private mapRedemption(r: { id: string; memberId: string; rewardId: string; programId: string; hotelId: string; guestId: string; points: number; status: string; reference: string | null; metadata: unknown; redeemedAt: Date; confirmedAt: Date | null; expiresAt: Date | null }): LoyaltyRedemption {
    return { id: r.id, memberId: r.memberId, rewardId: r.rewardId, programId: r.programId, hotelId: r.hotelId, guestId: r.guestId, points: r.points, status: r.status as LoyaltyRedemption["status"], reference: r.reference, metadata: r.metadata as Record<string, unknown> | null, redeemedAt: r.redeemedAt, confirmedAt: r.confirmedAt, expiresAt: r.expiresAt };
  }
}
