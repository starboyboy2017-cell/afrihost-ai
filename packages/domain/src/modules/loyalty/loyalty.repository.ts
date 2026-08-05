/**
 * Module 22 — Programme de fidélité : port de persistance.
 */
import type {
  LoyaltyBonus,
  LoyaltyMember,
  LoyaltyNotification,
  LoyaltyProgram,
  LoyaltyRedemption,
  LoyaltyReward,
  LoyaltyRule,
  LoyaltyTier,
  LoyaltyTransaction,
  MemberSummary,
  CreateProgramInput,
  CreateTierInput,
  CreateRuleInput,
  CreateRewardInput,
  CreateBonusInput,
} from "./loyalty.types.js";

export interface LoyaltyRepository {
  // Programmes
  createProgram(hotelId: string, organisationId: string, input: CreateProgramInput & { scope: "HOTEL" | "GROUP" }, participantHotels: string[]): Promise<LoyaltyProgram>;
  listPrograms(hotelId: string, organisationId: string): Promise<LoyaltyProgram[]>;
  getProgram(hotelId: string, programId: string): Promise<LoyaltyProgram | null>;
  programInHotel(hotelId: string, programId: string): Promise<boolean>;
  setProgramActive(hotelId: string, programId: string, isActive: boolean): Promise<void>;

  // Niveaux
  createTier(hotelId: string, programId: string, input: CreateTierInput): Promise<LoyaltyTier>;
  listTiers(hotelId: string, programId: string): Promise<LoyaltyTier[]>;
  setTierActive(hotelId: string, tierId: string, isActive: boolean): Promise<void>;

  // Règles
  createRule(hotelId: string, programId: string, input: CreateRuleInput): Promise<LoyaltyRule>;
  listRules(hotelId: string, programId: string): Promise<LoyaltyRule[]>;
  setRuleActive(hotelId: string, ruleId: string, isActive: boolean): Promise<void>;

  // Récompenses
  createReward(hotelId: string, programId: string, input: CreateRewardInput): Promise<LoyaltyReward>;
  listRewards(hotelId: string, programId: string): Promise<LoyaltyReward[]>;
  setRewardActive(hotelId: string, rewardId: string, isActive: boolean): Promise<void>;

  // Bonus
  createBonus(hotelId: string, programId: string, input: CreateBonusInput): Promise<LoyaltyBonus>;
  listBonuses(hotelId: string, programId: string): Promise<LoyaltyBonus[]>;
  setBonusActive(hotelId: string, bonusId: string, isActive: boolean): Promise<void>;

  // Adhésions
  enroll(hotelId: string, programId: string, guestId: string, tierId?: string): Promise<LoyaltyMember>;
  getMemberByGuest(hotelId: string, programId: string, guestId: string): Promise<LoyaltyMember | null>;
  getMember(hotelId: string, memberId: string): Promise<LoyaltyMember | null>;
  listMembers(hotelId: string, programId?: string): Promise<LoyaltyMember[]>;
  setMemberStatus(hotelId: string, memberId: string, status: string): Promise<void>;
  updateMemberPoints(hotelId: string, memberId: string, delta: number, tierId?: string): Promise<LoyaltyMember>;

  // Transactions
  recordTransaction(hotelId: string, tx: Omit<LoyaltyTransaction, "id" | "createdAt">): Promise<LoyaltyTransaction>;
  listTransactions(hotelId: string, memberId: string): Promise<LoyaltyTransaction[]>;
  hasEarned(hotelId: string, guestId: string, ruleId: string, reference: string): Promise<boolean>; // idempotence

  // Échanges
  createRedemption(hotelId: string, input: { memberId: string; rewardId: string; programId: string; guestId: string; points: number; reference?: string | null; metadata?: Record<string, unknown> | null }): Promise<LoyaltyRedemption>;
  listRedemptions(hotelId: string, memberId: string): Promise<LoyaltyRedemption[]>;
  getRedemption(hotelId: string, redemptionId: string): Promise<LoyaltyRedemption | null>;
  setRedemptionStatus(hotelId: string, redemptionId: string, status: string, confirmedAt?: Date): Promise<void>;

  // Notifications
  createNotification(hotelId: string, input: { memberId: string; guestId: string; type: string; title: string; body?: string | null }): Promise<LoyaltyNotification>;
  listNotifications(hotelId: string, memberId: string): Promise<LoyaltyNotification[]>;
  markNotificationsRead(hotelId: string, memberId: string): Promise<void>;

  // Synthèse / intégration
  getMemberSummary(hotelId: string, memberId: string): Promise<MemberSummary | null>;
  /** Met à jour les champs dénormalisés du client (Guest.loyaltyPoints / loyaltyTier). */
  updateGuestSnapshot(hotelId: string, guestId: string, points: number, tier: string): Promise<void>;
  guestExists(hotelId: string, guestId: string): Promise<boolean>;
  getGuestName(hotelId: string, guestId: string): Promise<{ firstName: string; lastName: string; email?: string | null } | null>;
}
