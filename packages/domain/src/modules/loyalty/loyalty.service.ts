/**
 * Module 22 — Programme de fidélité : service métier.
 *
 * Couvre :
 *   - **programmes** configurables par hôtel ou groupe d'hôtels ;
 *   - **niveaux** (tiers) : Bronze, Argent, Or, Platine ou personnalisés ;
 *   - **moteur de règles** paramétrable pour l'attribution des points ;
 *   - **récompenses** échangeables (réduction, nuit gratuite, upgrade, service, bon) ;
 *   - **bonus** : bienvenue, anniversaire, parrainage, campagne ;
 *   - **solde / historique / notifications**, synchronisation CRM via EventBus.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC loyalty.*.
 * Chaque mutation est journalisée (audit). Aucun calcul en dur.
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { LoyaltyError } from "./loyalty.error.js";
import { evaluateRules } from "./loyalty.rule-engine.js";
import type {
  LoyaltyRepository,
} from "./loyalty.repository.js";
import type {
  AdjustPointsInput,
  AwardPointsInput,
  CreateBonusInput,
  CreateProgramInput,
  CreateRewardInput,
  CreateRuleInput,
  CreateTierInput,
  EnrollInput,
  LoyaltyBonus,
  LoyaltyMember,
  LoyaltyNotification,
  LoyaltyProgram,
  LoyaltyRedemption,
  LoyaltyReward,
  LoyaltyRule as LoyaltyRuleType,
  LoyaltyTier,
  LoyaltyTransaction,
  MemberSummary,
  RedeemInput,
} from "./loyalty.types.js";
import {
  validateAdjustPoints,
  validateAwardPoints,
  validateCreateBonus,
  validateCreateProgram,
  validateCreateReward,
  validateCreateLoyaltyRule,
  validateCreateTier,
  validateEnroll,
  validateRedeem,
} from "./loyalty.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface LoyaltyActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class LoyaltyService {
  constructor(
    private readonly repo: LoyaltyRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Programmes
  // ---------------------------------------------------------------------------

  async createProgram(hotelId: string, input: CreateProgramInput, actor: LoyaltyActor): Promise<LoyaltyProgram> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateProgram(input);
    const scope = v.scope ?? "HOTEL";
    const participants = scope === "GROUP"
      ? [...new Set([hotelId, ...(v.hotelIds ?? [])])]
      : [hotelId];
    const program = await this.repo.createProgram(hotelId, actor.organisationId, v as CreateProgramInput & { scope: "HOTEL" | "GROUP" }, participants);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.program.create", entityType: "LoyaltyProgram", entityId: program.id, after: { name: v.name, scope } });
    await this.bus.publish({ name: DomainEvents.loyaltyProgramCreated, hotelId, organisationId: actor.organisationId, data: { programId: program.id, scope } });
    return program;
  }

  async listPrograms(hotelId: string, actor: LoyaltyActor): Promise<LoyaltyProgram[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listPrograms(hotelId, actor.organisationId);
  }

  async setProgramActive(hotelId: string, programId: string, isActive: boolean, actor: LoyaltyActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setProgramActive(hotelId, programId, isActive);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.program.toggle", entityType: "LoyaltyProgram", entityId: programId, after: { isActive } });
  }

  // ---------------------------------------------------------------------------
  // Niveaux
  // ---------------------------------------------------------------------------

  async createTier(hotelId: string, programId: string, input: CreateTierInput, actor: LoyaltyActor): Promise<LoyaltyTier> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.programInHotel(hotelId, programId))) throw new LoyaltyError("Programme introuvable");
    const v = validateCreateTier(input);
    const tier = await this.repo.createTier(hotelId, programId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.tier.create", entityType: "LoyaltyTier", entityId: tier.id, after: { code: v.code, name: v.name } });
    return tier;
  }

  async listTiers(hotelId: string, programId: string, actor: LoyaltyActor): Promise<LoyaltyTier[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTiers(hotelId, programId);
  }

  // ---------------------------------------------------------------------------
  // Règles
  // ---------------------------------------------------------------------------

  async createRule(hotelId: string, programId: string, input: CreateRuleInput, actor: LoyaltyActor): Promise<LoyaltyRuleType> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.programInHotel(hotelId, programId))) throw new LoyaltyError("Programme introuvable");
    const v = validateCreateLoyaltyRule(input);
    const rule = await this.repo.createRule(hotelId, programId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.rule.create", entityType: "LoyaltyRule", entityId: rule.id, after: { name: v.name, trigger: v.trigger } });
    return rule;
  }

  async listRules(hotelId: string, programId: string, actor: LoyaltyActor): Promise<LoyaltyRuleType[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRules(hotelId, programId);
  }

  // ---------------------------------------------------------------------------
  // Récompenses
  // ---------------------------------------------------------------------------

  async createReward(hotelId: string, programId: string, input: CreateRewardInput, actor: LoyaltyActor): Promise<LoyaltyReward> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.programInHotel(hotelId, programId))) throw new LoyaltyError("Programme introuvable");
    const v = validateCreateReward(input);
    const reward = await this.repo.createReward(hotelId, programId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.reward.create", entityType: "LoyaltyReward", entityId: reward.id, after: { name: v.name, type: v.type } });
    return reward;
  }

  async listRewards(hotelId: string, programId: string, actor: LoyaltyActor): Promise<LoyaltyReward[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRewards(hotelId, programId);
  }

  // ---------------------------------------------------------------------------
  // Bonus
  // ---------------------------------------------------------------------------

  async createBonus(hotelId: string, programId: string, input: CreateBonusInput, actor: LoyaltyActor): Promise<LoyaltyBonus> {
    this.assertHotel(hotelId, actor);
    if (!(await this.repo.programInHotel(hotelId, programId))) throw new LoyaltyError("Programme introuvable");
    const v = validateCreateBonus(input);
    const bonus = await this.repo.createBonus(hotelId, programId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.bonus.create", entityType: "LoyaltyBonus", entityId: bonus.id, after: { name: v.name, bonusType: v.bonusType } });
    return bonus;
  }

  async listBonuses(hotelId: string, programId: string, actor: LoyaltyActor): Promise<LoyaltyBonus[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listBonuses(hotelId, programId);
  }

  // ---------------------------------------------------------------------------
  // Adhésions
  // ---------------------------------------------------------------------------

  async enroll(hotelId: string, input: EnrollInput, actor: LoyaltyActor): Promise<LoyaltyMember> {
    this.assertHotel(hotelId, actor);
    const v = validateEnroll(input);
    if (!(await this.repo.guestExists(hotelId, v.guestId))) throw new LoyaltyError("Client introuvable");
    if (!(await this.repo.programInHotel(hotelId, v.programId))) throw new LoyaltyError("Programme introuvable");
    const tiers = await this.repo.listTiers(hotelId, v.programId);
    const lowest = tiers.filter((t) => t.isActive).sort((a, b) => a.rank - b.rank)[0];
    const member = await this.repo.enroll(hotelId, v.programId, v.guestId, lowest?.id);
    await this.repo.updateGuestSnapshot(hotelId, v.guestId, member.pointsBalance, lowest?.code ?? "BRONZE");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.member.enroll", entityType: "LoyaltyMember", entityId: member.id, after: { guestId: v.guestId, programId: v.programId } });
    await this.bus.publish({ name: DomainEvents.loyaltyMemberEnrolled, hotelId, organisationId: actor.organisationId, data: { memberId: member.id, guestId: v.guestId, programId: v.programId } });
    return member;
  }

  async listMembers(hotelId: string, programId: string | undefined, actor: LoyaltyActor): Promise<LoyaltyMember[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listMembers(hotelId, programId);
  }

  async getMemberSummary(hotelId: string, memberId: string, actor: LoyaltyActor): Promise<MemberSummary> {
    this.assertHotel(hotelId, actor);
    const s = await this.repo.getMemberSummary(hotelId, memberId);
    if (!s) throw new LoyaltyError("Adhésion introuvable");
    return s;
  }

  async setMemberStatus(hotelId: string, memberId: string, status: string, actor: LoyaltyActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setMemberStatus(hotelId, memberId, status);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.member.status", entityType: "LoyaltyMember", entityId: memberId, after: { status } });
  }

  // ---------------------------------------------------------------------------
  // Points : attribution (moteur de règles)
  // ---------------------------------------------------------------------------

  async awardPoints(hotelId: string, input: AwardPointsInput, actor: LoyaltyActor): Promise<LoyaltyTransaction[]> {
    this.assertHotel(hotelId, actor);
    const v = validateAwardPoints(input);
    if (!(await this.repo.guestExists(hotelId, v.guestId))) throw new LoyaltyError("Client introuvable");
    const programs = (await this.repo.listPrograms(hotelId, actor.organisationId)).filter((p) => p.isActive);
    const created: LoyaltyTransaction[] = [];
    for (const program of programs) {
      const member = await this.repo.getMemberByGuest(hotelId, program.id, v.guestId);
      if (!member || member.status !== "ACTIVE") continue;
      const rules = await this.repo.listRules(hotelId, program.id);
      const ctx = { guestId: v.guestId, ...(v.context ?? {}), sourceModule: v.sourceModule ?? v.context?.sourceModule };
      const evaluations = evaluateRules(rules, v.trigger, ctx);
      for (const ev of evaluations) {
        // Idempotence : une même règle ne s'applique qu'une fois par référence d'événement.
        const refKey = v.reference ?? `${v.guestId}:${v.trigger}:${ev.ruleId}`;
        if (await this.repo.hasEarned(hotelId, v.guestId, ev.ruleId, refKey)) continue;
        const newBalance = member.pointsBalance + ev.points;
        const tx = await this.repo.recordTransaction(hotelId, {
          guestId: v.guestId, memberId: member.id, programId: program.id, ruleId: ev.ruleId,
          hotelId, type: "EARN", points: ev.points, balanceAfter: newBalance, reference: refKey,
          description: ev.ruleName, sourceModule: v.sourceModule ?? v.context?.sourceModule,
        });
        const tiers = await this.repo.listTiers(hotelId, program.id);
        const tier = this.resolveTier(tiers, newBalance);
        await this.repo.updateMemberPoints(hotelId, member.id, ev.points, tier?.id);
        await this.repo.updateGuestSnapshot(hotelId, v.guestId, newBalance, tier?.code ?? "BRONZE");
        await this.repo.createNotification(hotelId, { memberId: member.id, guestId: v.guestId, type: "POINTS_EARNED", title: `${ev.points} points gagnés`, body: ev.ruleName });
        await this.bus.publish({ name: DomainEvents.loyaltyPointsEarned, hotelId, organisationId: actor.organisationId, data: { guestId: v.guestId, points: ev.points, ruleId: ev.ruleId, reference: refKey } });
        created.push(tx);
      }
    }
    return created;
  }

  // ---------------------------------------------------------------------------
  // Points : échange & ajustement
  // ---------------------------------------------------------------------------

  async redeem(hotelId: string, input: RedeemInput, actor: LoyaltyActor): Promise<LoyaltyRedemption> {
    this.assertHotel(hotelId, actor);
    const v = validateRedeem(input);
    if (!(await this.repo.guestExists(hotelId, v.guestId))) throw new LoyaltyError("Client introuvable");
    const programs = (await this.repo.listPrograms(hotelId, actor.organisationId)).filter((p) => p.isActive);
    for (const program of programs) {
      const member = await this.repo.getMemberByGuest(hotelId, program.id, v.guestId);
      if (!member || member.status !== "ACTIVE") continue;
      const rewards = await this.repo.listRewards(hotelId, program.id);
      const reward = rewards.find((r) => r.id === v.rewardId);
      if (!reward) throw new LoyaltyError("Récompense introuvable");
      if (!reward.isActive) throw new LoyaltyError("Récompense inactive");
      if (reward.stock != null && reward.stock <= 0) throw new LoyaltyError("Récompense épuisée");
      if (member.pointsBalance < reward.pointsCost) throw new LoyaltyError("Solde de points insuffisant");
      const redemption = await this.repo.createRedemption(hotelId, {
        memberId: member.id, rewardId: reward.id, programId: program.id, guestId: v.guestId,
        points: reward.pointsCost, reference: v.reference ?? null, metadata: v.metadata ?? null,
      });
      const newBalance = member.pointsBalance - reward.pointsCost;
      await this.repo.updateMemberPoints(hotelId, member.id, -reward.pointsCost);
      await this.repo.updateGuestSnapshot(hotelId, v.guestId, newBalance, member.tierId ? (await this.repo.listTiers(hotelId, program.id)).find((t) => t.id === member.tierId)?.code ?? "BRONZE" : "BRONZE");
      await this.repo.recordTransaction(hotelId, {
        guestId: v.guestId, memberId: member.id, programId: program.id, rewardId: reward.id,
        hotelId, type: "REDEEM", points: -reward.pointsCost, balanceAfter: newBalance,
        reference: redemption.id, description: `Échange : ${reward.name}`, sourceModule: "loyalty",
      });
      await this.repo.createNotification(hotelId, { memberId: member.id, guestId: v.guestId, type: "REDEMPTION_CONFIRMED", title: "Échange confirmé", body: `${reward.name} (${reward.pointsCost} pts)` });
      await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.redeem", entityType: "LoyaltyRedemption", entityId: redemption.id, after: { guestId: v.guestId, rewardId: reward.id, points: reward.pointsCost } });
      await this.bus.publish({ name: DomainEvents.loyaltyPointsRedeemed, hotelId, organisationId: actor.organisationId, data: { redemptionId: redemption.id, guestId: v.guestId, rewardId: reward.id, points: reward.pointsCost } });
      return redemption;
    }
    throw new LoyaltyError("Aucune adhésion active pour ce client");
  }

  async adjustPoints(hotelId: string, input: AdjustPointsInput, actor: LoyaltyActor): Promise<LoyaltyTransaction> {
    this.assertHotel(hotelId, actor);
    const v = validateAdjustPoints(input);
    if (!(await this.repo.guestExists(hotelId, v.guestId))) throw new LoyaltyError("Client introuvable");
    const programs = (await this.repo.listPrograms(hotelId, actor.organisationId)).filter((p) => p.isActive);
    for (const program of programs) {
      const member = await this.repo.getMemberByGuest(hotelId, program.id, v.guestId);
      if (!member || member.status !== "ACTIVE") continue;
      const newBalance = member.pointsBalance + v.points;
      if (newBalance < 0) throw new LoyaltyError("Ajustement impossible : solde négatif");
      const tx = await this.repo.recordTransaction(hotelId, {
        guestId: v.guestId, memberId: member.id, programId: program.id, hotelId, type: "ADJUST",
        points: v.points, balanceAfter: newBalance, reference: v.reference ?? null, description: v.reason, sourceModule: "loyalty",
      });
      const tiers = await this.repo.listTiers(hotelId, program.id);
      const tier = this.resolveTier(tiers, newBalance);
      await this.repo.updateMemberPoints(hotelId, member.id, v.points, tier?.id);
      await this.repo.updateGuestSnapshot(hotelId, v.guestId, newBalance, tier?.code ?? "BRONZE");
      await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.adjust", entityType: "LoyaltyTransaction", entityId: tx.id, after: { guestId: v.guestId, points: v.points, reason: v.reason } });
      return tx;
    }
    throw new LoyaltyError("Aucune adhésion active pour ce client");
  }

  async getTransactions(hotelId: string, memberId: string, actor: LoyaltyActor): Promise<LoyaltyTransaction[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTransactions(hotelId, memberId);
  }

  // ---------------------------------------------------------------------------
  // Échanges & notifications
  // ---------------------------------------------------------------------------

  async listRedemptions(hotelId: string, memberId: string, actor: LoyaltyActor): Promise<LoyaltyRedemption[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRedemptions(hotelId, memberId);
  }

  async confirmRedemption(hotelId: string, redemptionId: string, actor: LoyaltyActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setRedemptionStatus(hotelId, redemptionId, "CONFIRMED", new Date());
  }

  async cancelRedemption(hotelId: string, redemptionId: string, actor: LoyaltyActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const r = await this.repo.getRedemption(hotelId, redemptionId);
    if (!r) throw new LoyaltyError("Échange introuvable");
    await this.repo.setRedemptionStatus(hotelId, redemptionId, "CANCELLED");
    // Restitution des points
    await this.repo.updateMemberPoints(hotelId, r.memberId, r.points);
    const member = await this.repo.getMember(hotelId, r.memberId);
    if (member) await this.repo.updateGuestSnapshot(hotelId, r.guestId, member.pointsBalance, member.tierId ? (await this.repo.listTiers(hotelId, r.programId)).find((t) => t.id === member.tierId)?.code ?? "BRONZE" : "BRONZE");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "loyalty.redemption.cancel", entityType: "LoyaltyRedemption", entityId: redemptionId, after: { status: "CANCELLED" } });
  }

  async listNotifications(hotelId: string, memberId: string, actor: LoyaltyActor): Promise<LoyaltyNotification[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listNotifications(hotelId, memberId);
  }

  async markNotificationsRead(hotelId: string, memberId: string, actor: LoyaltyActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.markNotificationsRead(hotelId, memberId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Résout le niveau le plus élevé atteignable (règles d'accès configurables). */
  private resolveTier(tiers: LoyaltyTier[], lifetimePoints: number): LoyaltyTier | null {
    return tiers
      .filter((t) => t.isActive)
      .sort((a, b) => b.rank - a.rank)
      .find((t) => lifetimePoints >= t.minPoints) ?? null;
  }

  private assertHotel(hotelId: string, actor: LoyaltyActor): void {
    if (actor.hotelId !== hotelId) throw new LoyaltyError("Accès inter-hôtel refusé");
  }
}
