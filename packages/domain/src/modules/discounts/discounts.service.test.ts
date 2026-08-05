import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { DiscountsService, type DiscountsActor } from "./discounts.service.js";
import { DiscountsError } from "./discounts.error.js";
import type { DiscountsRepository } from "./discounts.repository.js";
import type {
  Coupon,
  CouponStatus,
  CreateDiscountRuleInput,
  DiscountRule,
  GenerateCouponInput,
} from "./discounts.types.js";

class MemoryRepo implements DiscountsRepository {
  rules = new Map<string, DiscountRule>();
  coupons = new Map<string, Coupon>();
  seq = 0;

  async createRule(hotelId: string, input: CreateDiscountRuleInput): Promise<DiscountRule> {
    const r: DiscountRule = { id: `dr-${++this.seq}`, hotelId, name: input.name, code: input.code ?? null, type: input.type, value: input.value, scope: input.scope ?? "POS", roleCap: input.roleCap ?? null, conditions: input.conditions ?? null, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    this.rules.set(r.id, r);
    return r;
  }
  async getRule(hotelId: string, id: string): Promise<DiscountRule | null> { const r = this.rules.get(id); return r && r.hotelId === hotelId ? r : null; }
  async listRules(hotelId: string, scope?: DiscountRule["scope"]): Promise<DiscountRule[]> {
    return [...this.rules.values()].filter((r) => r.hotelId === hotelId && (!scope || r.scope === scope));
  }
  async generateCoupon(hotelId: string, input: GenerateCouponInput, code: string): Promise<Coupon> {
    const c: Coupon = { id: `cp-${++this.seq}`, hotelId, ruleId: input.ruleId, code, status: "ACTIVE", singleUse: input.singleUse ?? false, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, issuedTo: input.issuedTo ?? null, createdAt: new Date(), updatedAt: new Date() };
    this.coupons.set(c.id, c);
    return c;
  }
  async getCouponByCode(hotelId: string, code: string): Promise<Coupon | null> {
    return [...this.coupons.values()].find((c) => c.hotelId === hotelId && c.code === code) ?? null;
  }
  async setCouponStatus(hotelId: string, id: string, status: CouponStatus, meta?: { usedBy?: string; at?: Date }): Promise<Coupon> {
    const c = this.coupons.get(id)!;
    const next = { ...c, status, usedBy: status === "USED" ? meta?.usedBy ?? null : c.usedBy, usedAt: status === "USED" ? meta?.at ?? new Date() : c.usedAt, updatedAt: new Date() } as Coupon;
    this.coupons.set(id, next);
    return next;
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new DiscountsService(repo, audit, bus);
  const actor: DiscountsActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 17 — Remises, promotions & coupons", () => {
  it("crée une règle de remise (pourcentage, scope POS)", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo 10%", code: "PROMO10", type: "PERCENT", value: 10, scope: "POS" }, actor);
    expect(rule.type).toBe("PERCENT");
    expect(rule.value).toBe(10);
    expect(rule.scope).toBe("POS");
  });

  it("rejette un pourcentage > 100", async () => {
    const { service, actor } = setup();
    await expect(service.createRule("h1", { name: "X", type: "PERCENT", value: 150 }, actor)).rejects.toThrow(/100/);
  });

  it("applique une remise en pourcentage", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo 10%", type: "PERCENT", value: 10 }, actor);
    const result = await service.applyRule("h1", rule.id, { amount: 5000, roleCode: "CASHIER" }, actor);
    expect(result.applied).toBe(true);
    expect(result.discountAmount).toBe(500);
    expect(result.finalAmount).toBe(4500);
  });

  it("applique une remise en montant fixe (bornée par le montant)", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Remise 2000", type: "FIXED", value: 2000 }, actor);
    const result = await service.applyRule("h1", rule.id, { amount: 1500, roleCode: "CASHIER" }, actor);
    expect(result.discountAmount).toBe(1500); // borné au montant
    expect(result.finalAmount).toBe(0);
  });

  it("applique le plafond par rôle (roleCap)", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo 20%", type: "PERCENT", value: 20, roleCap: 800 }, actor);
    const result = await service.applyRule("h1", rule.id, { amount: 10000, roleCode: "CASHIER" }, actor);
    // 20% de 10000 = 2000, plafonné à 800
    expect(result.discountAmount).toBe(800);
  });

  it("respecte les conditions (montant minimal)", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Min 10000", type: "FIXED", value: 2000, conditions: { minAmount: 10000 } }, actor);
    const denied = await service.applyRule("h1", rule.id, { amount: 5000, roleCode: "CASHIER" }, actor);
    expect(denied.applied).toBe(false);
    const accepted = await service.applyRule("h1", rule.id, { amount: 12000, roleCode: "CASHIER" }, actor);
    expect(accepted.applied).toBe(true);
  });

  it("respecte les conditions (canal)", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Canal WEBSITE", type: "PERCENT", value: 5, conditions: { channels: ["WEBSITE"] } }, actor);
    const denied = await service.applyRule("h1", rule.id, { amount: 5000, channel: "OTA" }, actor);
    expect(denied.applied).toBe(false);
    const accepted = await service.applyRule("h1", rule.id, { amount: 5000, channel: "WEBSITE" }, actor);
    expect(accepted.applied).toBe(true);
  });

  it("génère un coupon avec un code unique", async () => {
    const { repo, service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo 10%", code: "PROMO10", type: "PERCENT", value: 10 }, actor);
    const coupon = await service.generateCoupon("h1", { ruleId: rule.id }, actor);
    expect(coupon.code).toMatch(/^PROMO10-/);
    expect(coupon.status).toBe("ACTIVE");
    expect(repo.coupons.size).toBe(1);
  });

  it("valide et applique un coupon par code", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo 10%", code: "PROMO10", type: "PERCENT", value: 10 }, actor);
    const coupon = await service.generateCoupon("h1", { ruleId: rule.id }, actor);
    const result = await service.validateCoupon("h1", coupon.code, { amount: 5000, roleCode: "CASHIER" }, actor);
    expect(result.applied).toBe(true);
    expect(result.discountAmount).toBe(500);
  });

  it("rejette un coupon déjà utilisé (singleUse)", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo", code: "PROMO", type: "FIXED", value: 1000 }, actor);
    const coupon = await service.generateCoupon("h1", { ruleId: rule.id, singleUse: true }, actor);
    await service.validateCoupon("h1", coupon.code, { amount: 5000, roleCode: "CASHIER" }, actor);
    const second = await service.validateCoupon("h1", coupon.code, { amount: 5000, roleCode: "CASHIER" }, actor);
    expect(second.applied).toBe(false);
    expect(second.reason).toMatch(/utilisé/);
  });

  it("rejette un coupon expiré", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo", code: "PROMO", type: "FIXED", value: 1000 }, actor);
    const coupon = await service.generateCoupon("h1", { ruleId: rule.id, expiresAt: "2020-01-01" }, actor);
    const result = await service.validateCoupon("h1", coupon.code, { amount: 5000, roleCode: "CASHIER" }, actor);
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/expiré/);
  });

  it("révoque un coupon", async () => {
    const { service, actor } = setup();
    const rule = await service.createRule("h1", { name: "Promo", code: "PROMO", type: "FIXED", value: 1000 }, actor);
    const coupon = await service.generateCoupon("h1", { ruleId: rule.id }, actor);
    const revoked = await service.revokeCoupon("h1", coupon.id, actor);
    expect(revoked.status).toBe("REVOKED");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: DiscountsActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createRule("h1", { name: "X", type: "FIXED", value: 100 }, other)).rejects.toThrow(DiscountsError);
  });

  it("liste les règles par portée", async () => {
    const { service, actor } = setup();
    await service.createRule("h1", { name: "POS", type: "FIXED", value: 100, scope: "POS" }, actor);
    await service.createRule("h1", { name: "RES", type: "FIXED", value: 200, scope: "RESERVATION" }, actor);
    const pos = await service.listRules("h1", "POS", actor);
    expect(pos.length).toBe(1);
  });
});
