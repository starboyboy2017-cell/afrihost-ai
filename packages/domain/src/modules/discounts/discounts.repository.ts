/**
 * Module 17 — Remises : port de persistance.
 */
import type {
  Coupon,
  CouponStatus,
  CreateDiscountRuleInput,
  DiscountRule,
  GenerateCouponInput,
} from "./discounts.types.js";

export interface DiscountsRepository {
  // Règles
  createRule(hotelId: string, input: CreateDiscountRuleInput): Promise<DiscountRule>;
  getRule(hotelId: string, ruleId: string): Promise<DiscountRule | null>;
  listRules(hotelId: string, scope?: DiscountRule["scope"]): Promise<DiscountRule[]>;

  // Coupons
  generateCoupon(hotelId: string, input: GenerateCouponInput, code: string): Promise<Coupon>;
  getCouponByCode(hotelId: string, code: string): Promise<Coupon | null>;
  setCouponStatus(hotelId: string, couponId: string, status: CouponStatus, meta?: { usedBy?: string; at?: Date }): Promise<Coupon>;
}
