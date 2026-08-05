/**
 * Module 17 — Remises : adapter Prisma.
 */
import type {
  DiscountsRepository,
  Coupon,
  CouponStatus,
  CreateDiscountRuleInput,
  DiscountRule,
  GenerateCouponInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaDiscountsRepository implements DiscountsRepository {
  async createRule(hotelId: string, input: CreateDiscountRuleInput): Promise<DiscountRule> {
    const r = await prisma.discountRule.create({
      data: {
        hotelId, name: input.name, code: input.code ?? null, type: input.type, value: input.value,
        scope: input.scope ?? "POS", roleCap: input.roleCap ?? null,
        conditions: input.conditions as import("@prisma/client").Prisma.InputJsonValue | undefined,
      },
    });
    return mapRule(r);
  }
  async getRule(hotelId: string, id: string): Promise<DiscountRule | null> {
    const r = await prisma.discountRule.findFirst({ where: { id, hotelId } });
    return r ? mapRule(r) : null;
  }
  async listRules(hotelId: string, scope?: DiscountRule["scope"]): Promise<DiscountRule[]> {
    const rows = await prisma.discountRule.findMany({ where: { hotelId, deletedAt: null, ...(scope ? { scope } : {}) }, orderBy: { name: "asc" } });
    return rows.map(mapRule);
  }
  async generateCoupon(hotelId: string, input: GenerateCouponInput, code: string): Promise<Coupon> {
    const c = await prisma.coupon.create({ data: { hotelId, ruleId: input.ruleId, code, singleUse: input.singleUse ?? false, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, issuedTo: input.issuedTo ?? null } });
    return mapCoupon(c);
  }
  async getCouponByCode(hotelId: string, code: string): Promise<Coupon | null> {
    const c = await prisma.coupon.findFirst({ where: { hotelId, code } });
    return c ? mapCoupon(c) : null;
  }
  async setCouponStatus(hotelId: string, id: string, status: CouponStatus, meta?: { usedBy?: string; at?: Date }): Promise<Coupon> {
    const c = await prisma.coupon.update({
      where: { id, hotelId },
      data: {
        status,
        usedBy: status === "USED" ? meta?.usedBy ?? null : undefined,
        usedAt: status === "USED" ? meta?.at ?? new Date() : undefined,
      },
    });
    return mapCoupon(c);
  }
}

type RuleRow = { id: string; hotelId: string; name: string; code: string | null; type: string; value: number; scope: string; roleCap: number | null; conditions: import("@prisma/client").Prisma.JsonValue; isActive: boolean; createdAt: Date; updatedAt: Date };
function mapRule(r: RuleRow): DiscountRule {
  return {
    id: r.id, hotelId: r.hotelId, name: r.name, code: r.code, type: r.type as DiscountRule["type"],
    value: r.value, scope: r.scope as DiscountRule["scope"], roleCap: r.roleCap,
    conditions: r.conditions as DiscountRule["conditions"], isActive: r.isActive, createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}
type CouponRow = { id: string; hotelId: string; ruleId: string; code: string; status: string; singleUse: boolean; usedBy: string | null; usedAt: Date | null; expiresAt: Date | null; issuedTo: string | null; createdAt: Date; updatedAt: Date };
function mapCoupon(c: CouponRow): Coupon {
  return { id: c.id, hotelId: c.hotelId, ruleId: c.ruleId, code: c.code, status: c.status as Coupon["status"], singleUse: c.singleUse, usedBy: c.usedBy, usedAt: c.usedAt, expiresAt: c.expiresAt, issuedTo: c.issuedTo, createdAt: c.createdAt, updatedAt: c.updatedAt };
}
