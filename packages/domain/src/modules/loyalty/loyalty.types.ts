/**
 * Module 22 — Programme de fidélité : types du domaine.
 *
 * Conçu pour être **entièrement paramétrable** (aucun calcul métier en dur) :
 * l'attribution des points est pilotée par des `LoyaltyRule` persistées, les
 * niveaux par des `LoyaltyTier` configurables, et les récompenses par des
 * `LoyaltyReward`. Tout est scoped par hôtel (RLS) et, optionnellement, par
 * groupe d'hôtels via `LoyaltyProgramHotel`.
 */

/** Portée d'un programme. */
export type ProgramScope = "HOTEL" | "GROUP";

/** Type d'événement déclencheur d'une règle d'attribution. */
export type RuleTrigger =
  | "night_earned"
  | "spend_earned"
  | "service_earned"
  | "promotion"
  | "campaign"
  | "referral"
  | "welcome"
  | "birthday"
  | "custom";

/** Type de bonus. */
export type BonusType = "WELCOME" | "BIRTHDAY" | "REFERRAL" | "CAMPAIGN" | "OTHER";

/** Type de récompense. */
export type RewardType = "DISCOUNT" | "FREE_NIGHT" | "UPGRADE" | "SERVICE" | "VOUCHER";

/** Type de notification fidélité. */
export type NotificationType =
  | "POINTS_EARNED"
  | "POINTS_EXPIRING"
  | "TIER_UPGRADED"
  | "TIER_DOWNGRADED"
  | "REWARD_AVAILABLE"
  | "REDEMPTION_CONFIRMED"
  | "WELCOME"
  | "CAMPAIGN";

/** Statut d'un membre. */
export type MemberStatus = "ACTIVE" | "SUSPENDED" | "EXITED";

/** Statut d'un échange. */
export type RedemptionStatus = "PENDING" | "CONFIRMED" | "USED" | "CANCELLED";

/** Programme de fidélité. */
export interface LoyaltyProgram {
  id: string;
  hotelId: string;
  organisationId: string;
  name: string;
  scope: ProgramScope;
  description?: string | null;
  currency: string;
  pointsPerSpend: number;
  pointsPerNight: number;
  validityDays: number;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  config?: Record<string, unknown> | null;
}

/** Niveau de fidélité. */
export interface LoyaltyTier {
  id: string;
  programId: string;
  hotelId: string;
  code: string;
  name: string;
  rank: number;
  minPoints: number;
  minStays: number;
  minSpend: number;
  benefits?: Record<string, unknown> | null;
  accessRules?: Record<string, unknown> | null;
  keepRules?: Record<string, unknown> | null;
  isActive: boolean;
}

/** Règle d'attribution (moteur paramétrable). */
export interface LoyaltyRule {
  id: string;
  programId: string;
  hotelId: string;
  name: string;
  trigger: string;
  condition?: Record<string, unknown> | null;
  points: number;
  pointsPerUnit: number;
  multiplier: number;
  capPerEvent?: number | null;
  priority: number;
  isActive: boolean;
}

/** Récompense. */
export interface LoyaltyReward {
  id: string;
  programId: string;
  hotelId: string;
  name: string;
  type: RewardType;
  pointsCost: number;
  value: number;
  description?: string | null;
  config?: Record<string, unknown> | null;
  validityDays: number;
  stock?: number | null;
  isActive: boolean;
}

/** Bonus. */
export interface LoyaltyBonus {
  id: string;
  programId: string;
  hotelId: string;
  name: string;
  bonusType: BonusType;
  points: number;
  condition?: Record<string, unknown> | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
}

/** Adhésion d'un client. */
export interface LoyaltyMember {
  id: string;
  programId: string;
  hotelId: string;
  guestId: string;
  tierId?: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  joinedAt: Date;
  lastEarnAt?: Date | null;
  expiresAt?: Date | null;
  status: MemberStatus;
}

/** Échange de points. */
export interface LoyaltyRedemption {
  id: string;
  memberId: string;
  rewardId: string;
  programId: string;
  hotelId: string;
  guestId: string;
  points: number;
  status: RedemptionStatus;
  reference?: string | null;
  metadata?: Record<string, unknown> | null;
  redeemedAt: Date;
  confirmedAt?: Date | null;
  expiresAt?: Date | null;
}

/** Transaction de points. */
export interface LoyaltyTransaction {
  id: string;
  guestId: string;
  memberId?: string | null;
  programId?: string | null;
  ruleId?: string | null;
  rewardId?: string | null;
  hotelId: string;
  type: "EARN" | "REDEEM" | "ADJUST";
  points: number;
  balanceAfter?: number | null;
  reference?: string | null;
  description?: string | null;
  sourceModule?: string | null;
  createdAt: Date;
}

/** Notification. */
export interface LoyaltyNotification {
  id: string;
  memberId: string;
  guestId: string;
  hotelId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  read: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateProgramInput {
  name: string;
  scope?: ProgramScope;
  hotelIds?: string[]; // hôtels participants (scope=GROUP)
  description?: string | null;
  currency?: string;
  pointsPerSpend?: number;
  pointsPerNight?: number;
  validityDays?: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  config?: Record<string, unknown>;
}

export interface CreateTierInput {
  code: string;
  name: string;
  rank?: number;
  minPoints?: number;
  minStays?: number;
  minSpend?: number;
  benefits?: Record<string, unknown>;
  accessRules?: Record<string, unknown>;
  keepRules?: Record<string, unknown>;
}

export interface CreateRuleInput {
  name: string;
  trigger: RuleTrigger;
  condition?: Record<string, unknown>;
  points?: number;
  pointsPerUnit?: number;
  multiplier?: number;
  capPerEvent?: number | null;
  priority?: number;
}

export interface CreateRewardInput {
  name: string;
  type: RewardType;
  pointsCost: number;
  value?: number;
  description?: string | null;
  config?: Record<string, unknown>;
  validityDays?: number;
  stock?: number | null;
}

export interface CreateBonusInput {
  name: string;
  bonusType: BonusType;
  points: number;
  condition?: Record<string, unknown>;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
}

/** Contexte d'un événement déclencheur (évalué par le moteur de règles). */
export interface RuleContext {
  guestId: string;
  amount?: number; // montant dépensé (XOF)
  nights?: number; // nuits
  sourceModule?: string; // reservations | pos | billing | promotions | campaign
  channel?: string; // direct, booking.com, ...
  segment?: string; // code segment
  roomTypeId?: string;
  count?: number;
  extra?: Record<string, unknown>;
}

/** Résultat d'une évaluation de règles. */
export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  points: number;
}

export interface AwardPointsInput {
  guestId: string;
  trigger: RuleTrigger;
  context?: Omit<RuleContext, "guestId">;
  reference?: string;
  sourceModule?: string;
}

export interface RedeemInput {
  guestId: string;
  rewardId: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface AdjustPointsInput {
  guestId: string;
  points: number;
  reason: string;
  reference?: string;
}

export interface EnrollInput {
  guestId: string;
  programId: string;
}

/** Vue complète d'un membre (solde, niveau, historique, notifications). */
export interface MemberSummary {
  member: LoyaltyMember;
  guestName: string;
  guestEmail?: string | null;
  tierName?: string | null;
  tierCode?: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  redeemable: LoyaltyReward[];
  transactions: LoyaltyTransaction[];
  notifications: LoyaltyNotification[];
}
