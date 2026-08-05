/**
 * Module 17 — Remises, promotions & coupons : types du domaine.
 */

/** Type de remise. */
export type DiscountType = "PERCENT" | "FIXED";

/** Portée d'une remise. */
export type DiscountScope = "POS" | "RESERVATION" | "BILLING";

/** Statut d'un coupon. */
export type CouponStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

/** Conditions configurables d'une règle de remise. */
export interface DiscountConditions {
  dateFrom?: Date | string;
  dateTo?: Date | string;
  channels?: string[];
  guestTypes?: string[];
  roomTypeIds?: string[];
  minAmount?: number;
  maxAmount?: number;
}

/** Règle de remise. */
export interface DiscountRule {
  id: string;
  hotelId: string;
  name: string;
  code?: string | null;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  roleCap?: number | null;
  conditions?: DiscountConditions | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Coupon. */
export interface Coupon {
  id: string;
  hotelId: string;
  ruleId: string;
  code: string;
  status: CouponStatus;
  singleUse: boolean;
  usedBy?: string | null;
  usedAt?: Date | null;
  expiresAt?: Date | null;
  issuedTo?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Saisie de création d'une règle. */
export interface CreateDiscountRuleInput {
  name: string;
  code?: string | null;
  type: DiscountType;
  value: number;
  scope?: DiscountScope;
  roleCap?: number | null;
  conditions?: DiscountConditions;
}

/** Saisie de génération d'un coupon. */
export interface GenerateCouponInput {
  ruleId: string;
  singleUse?: boolean;
  expiresAt?: Date | string | null;
  issuedTo?: string | null;
}

/** Contexte d'application d'une remise/coupon. */
export interface DiscountContext {
  roleCode?: string | null;
  channel?: string | null;
  guestType?: string | null;
  roomTypeId?: string | null;
  amount: number; // montant de base (minor units)
  date?: Date;
}

/** Résultat d'application d'une remise. */
export interface DiscountResult {
  applied: boolean;
  discountAmount: number;
  finalAmount: number;
  reason?: string;
}
