/**
 * Module 17 — Remises, promotions & coupons : service métier.
 *
 * Moteur de règles **flexible** compatible PMS / POS / caisse / facturation :
 *   - règles de remise (type %, montant fixe ; portée POS/RESERVATION/BILLING) ;
 *   - **plafonds par rôle** (roleCap) ;
 *   - **conditions** : dates, canaux, types de clients, types de chambres, montants ;
 *   - **génération et validation des coupons** ;
 *   - intégration folios clients (scope BILLING).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC discounts.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { DiscountsError } from "./discounts.error.js";
import type { DiscountsRepository } from "./discounts.repository.js";
import type {
  Coupon,
  CreateDiscountRuleInput,
  DiscountContext,
  DiscountResult,
  DiscountRule,
  GenerateCouponInput,
} from "./discounts.types.js";
import { validateCreateRule, validateGenerateCoupon } from "./discounts.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface DiscountsActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class DiscountsService {
  constructor(
    private readonly repo: DiscountsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée une règle de remise (moteur flexible). */
  async createRule(hotelId: string, input: CreateDiscountRuleInput, actor: DiscountsActor): Promise<DiscountRule> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateRule(input);
    const rule = await this.repo.createRule(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "discounts.rule.create", entityType: "DiscountRule", entityId: rule.id,
      after: { name: rule.name, type: rule.type, value: rule.value, scope: rule.scope },
    });
    return rule;
  }

  /** Liste les règles (par portée). */
  async listRules(hotelId: string, scope: DiscountRule["scope"] | undefined, actor: DiscountsActor): Promise<DiscountRule[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRules(hotelId, scope);
  }

  /** Génère un coupon à partir d'une règle. */
  async generateCoupon(hotelId: string, input: GenerateCouponInput, actor: DiscountsActor): Promise<Coupon> {
    this.assertHotel(hotelId, actor);
    const v = validateGenerateCoupon(input);
    const rule = await this.repo.getRule(hotelId, v.ruleId);
    if (!rule) throw new DiscountsError("Règle de remise introuvable");

    const code = `${rule.code ?? "CPN"}-${randomCode(6)}`;
    const coupon = await this.repo.generateCoupon(hotelId, v, code);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "coupons.generate", entityType: "Coupon", entityId: coupon.id,
      after: { code, ruleId: v.ruleId },
    });
    return coupon;
  }

  /**
   * Valide et applique une remise/coupon selon les conditions.
   * @returns le montant de remise calculé et le montant final.
   */
  async applyRule(hotelId: string, ruleId: string, ctx: DiscountContext, actor: DiscountsActor): Promise<DiscountResult> {
    this.assertHotel(hotelId, actor);
    const rule = await this.repo.getRule(hotelId, ruleId);
    if (!rule) throw new DiscountsError("Règle de remise introuvable");
    if (!rule.isActive) return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Règle inactive" };

    // Vérifier les conditions
    if (!matchesConditions(rule, ctx)) {
      return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Conditions non satisfaites" };
    }

    // Calculer la remise
    let discount = rule.type === "PERCENT" ? Math.round(ctx.amount * rule.value / 100) : Math.min(rule.value, ctx.amount);

    // Plafond par rôle
    if (rule.roleCap !== null && rule.roleCap !== undefined && ctx.roleCode && discount > rule.roleCap) {
      discount = rule.roleCap;
    }

    discount = Math.max(0, discount);
    return { applied: true, discountAmount: discount, finalAmount: ctx.amount - discount };
  }

  /**
   * Valide un coupon par son code et applique sa règle.
   * Si singleUse → marque USED.
   */
  async validateCoupon(hotelId: string, code: string, ctx: DiscountContext, actor: DiscountsActor): Promise<DiscountResult> {
    this.assertHotel(hotelId, actor);
    const coupon = await this.repo.getCouponByCode(hotelId, code);
    if (!coupon) return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Coupon introuvable" };
    if (coupon.status === "USED") return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Coupon déjà utilisé" };
    if (coupon.status === "REVOKED") return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Coupon révoqué" };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Coupon expiré" };

    const rule = await this.repo.getRule(hotelId, coupon.ruleId);
    if (!rule || !rule.isActive) return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Règle inactive" };
    if (!matchesConditions(rule, ctx)) return { applied: false, discountAmount: 0, finalAmount: ctx.amount, reason: "Conditions non satisfaites" };

    let discount = rule.type === "PERCENT" ? Math.round(ctx.amount * rule.value / 100) : Math.min(rule.value, ctx.amount);
    if (rule.roleCap !== null && rule.roleCap !== undefined && ctx.roleCode && discount > rule.roleCap) discount = rule.roleCap;
    discount = Math.max(0, discount);

    // Marquer le coupon si singleUse
    if (coupon.singleUse) {
      await this.repo.setCouponStatus(hotelId, coupon.id, "USED", { usedBy: ctx.roleCode ?? undefined, at: new Date() });
    }
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "coupons.apply", entityType: "Coupon", entityId: coupon.id,
      after: { code, discount },
    });
    return { applied: true, discountAmount: discount, finalAmount: ctx.amount - discount };
  }

  /** Révoque un coupon. */
  async revokeCoupon(hotelId: string, couponId: string, actor: DiscountsActor): Promise<Coupon> {
    this.assertHotel(hotelId, actor);
    const coupon = await this.repo.setCouponStatus(hotelId, couponId, "REVOKED");
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "coupons.revoke", entityType: "Coupon", entityId: couponId,
      after: { status: "REVOKED" },
    });
    return coupon;
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: DiscountsActor): void {
    if (actor.hotelId !== hotelId) throw new DiscountsError("Accès inter-hôtel refusé");
  }
}

/** Vérifie les conditions d'une règle contre le contexte d'application. */
function matchesConditions(rule: DiscountRule, ctx: DiscountContext): boolean {
  const c = rule.conditions;
  if (!c) return true;
  const date = ctx.date ?? new Date();
  if (c.dateFrom && date < new Date(c.dateFrom)) return false;
  if (c.dateTo && date > new Date(c.dateTo)) return false;
  if (c.channels && c.channels.length > 0 && ctx.channel && !c.channels.includes(ctx.channel)) return false;
  if (c.guestTypes && c.guestTypes.length > 0 && ctx.guestType && !c.guestTypes.includes(ctx.guestType)) return false;
  if (c.roomTypeIds && c.roomTypeIds.length > 0 && ctx.roomTypeId && !c.roomTypeIds.includes(ctx.roomTypeId)) return false;
  if (c.minAmount !== undefined && ctx.amount < c.minAmount) return false;
  if (c.maxAmount !== undefined && ctx.amount > c.maxAmount) return false;
  return true;
}

/** Génère un code aléatoire. */
function randomCode(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
