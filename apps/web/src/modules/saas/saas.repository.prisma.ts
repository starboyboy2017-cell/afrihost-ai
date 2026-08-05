/**
 * Module 32 — Billing SaaS : adapter Prisma.
 */
import type {
  SaasRepository,
  CreateCouponInput, CreateManualPaymentInput, CreatePaymentMethodInput, CreatePlanInput,
  CreateSubscriptionInput, SaasCoupon, SaasInvoice, SaasManualPayment, SaasPayment, SaasPaymentMethod,
  SaasPlan, SaasSubscription,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

function mapPlan(p: { id: string; code: string; name: string; description: string | null; price: number; currency: string; billingCycle: string; trialDays: number; maxUsers: number; maxHotels: number; maxRooms: number; quotaAi: number; quotaEmail: number; quotaSms: number; quotaWhatsapp: number; quotaApi: number; modules: string[]; features: unknown; allowedPaymentMethods: string[]; allowedCountries: string[]; isActive: boolean }): SaasPlan {
  return { id: p.id, code: p.code, name: p.name, description: p.description, price: p.price, currency: p.currency, billingCycle: p.billingCycle, trialDays: p.trialDays, maxUsers: p.maxUsers, maxHotels: p.maxHotels, maxRooms: p.maxRooms, quotaAi: p.quotaAi, quotaEmail: p.quotaEmail, quotaSms: p.quotaSms, quotaWhatsapp: p.quotaWhatsapp, quotaApi: p.quotaApi, modules: p.modules, features: p.features as Record<string, unknown> | null, allowedPaymentMethods: p.allowedPaymentMethods, allowedCountries: p.allowedCountries, isActive: p.isActive };
}

export class PrismaSaasRepository implements SaasRepository {
  async createPlan(input: CreatePlanInput): Promise<SaasPlan> {
    const p = await prisma.saasPlan.create({ data: { code: input.code, name: input.name, description: input.description ?? null, price: input.price ?? 0, currency: input.currency ?? "XOF", billingCycle: input.billingCycle ?? "MONTHLY", trialDays: input.trialDays ?? 0, maxUsers: input.maxUsers ?? 1, maxHotels: input.maxHotels ?? 1, maxRooms: input.maxRooms ?? 0, quotaAi: input.quotaAi ?? 0, quotaEmail: input.quotaEmail ?? 0, quotaSms: input.quotaSms ?? 0, quotaWhatsapp: input.quotaWhatsapp ?? 0, quotaApi: input.quotaApi ?? 0, modules: input.modules ?? [], features: input.features ? json(input.features) : undefined, allowedPaymentMethods: input.allowedPaymentMethods ?? [], allowedCountries: input.allowedCountries ?? [] } });
    return mapPlan(p);
  }
  async listPlans(includeInactive = false): Promise<SaasPlan[]> {
    const rows = await prisma.saasPlan.findMany({ where: includeInactive ? {} : { isActive: true }, orderBy: { price: "asc" } });
    return rows.map(mapPlan);
  }
  async getPlanByCode(code: string): Promise<SaasPlan | null> {
    const p = await prisma.saasPlan.findUnique({ where: { code } });
    return p ? mapPlan(p) : null;
  }
  async setPlanActive(planId: string, isActive: boolean): Promise<void> {
    await prisma.saasPlan.update({ where: { id: planId }, data: { isActive } });
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SaasSubscription> {
    const plan = await prisma.saasPlan.findUnique({ where: { code: input.planCode } });
    if (!plan) throw new Error("Plan introuvable");
    const now = new Date();
    const months = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 }[input.billingCycle ?? plan.billingCycle] ?? 1;
    const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + months);
    const renewsAt = new Date(periodEnd); renewsAt.setMonth(renewsAt.getMonth() + months);
    const s = await prisma.saasSubscription.create({
      data: { organisationId: input.organisationId, hotelId: input.hotelId ?? null, planId: plan.id, status: plan.trialDays > 0 ? "TRIAL" : "ACTIVE", billingCycle: input.billingCycle ?? plan.billingCycle, startsAt: now, trialEndsAt: plan.trialDays > 0 ? new Date(now.getTime() + plan.trialDays * 86400000) : null, currentPeriodStart: now, currentPeriodEnd: periodEnd, renewsAt, price: plan.price, currency: plan.currency },
    });
    return this.mapSub(s);
  }
  async listSubscriptions(status?: string): Promise<SaasSubscription[]> {
    const rows = await prisma.saasSubscription.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" } });
    return rows.map((s) => this.mapSub(s));
  }
  async getSubscription(id: string): Promise<SaasSubscription | null> {
    const s = await prisma.saasSubscription.findUnique({ where: { id } });
    return s ? this.mapSub(s) : null;
  }
  async getSubscriptionByOrg(org: string): Promise<SaasSubscription | null> {
    const s = await prisma.saasSubscription.findFirst({ where: { organisationId: org }, orderBy: { createdAt: "desc" } });
    return s ? this.mapSub(s) : null;
  }
  async setSubscriptionStatus(id: string, status: string): Promise<void> { await prisma.saasSubscription.update({ where: { id }, data: { status } }); }
  async renewSubscription(id: string, ps: Date, pe: Date, ra: Date): Promise<SaasSubscription> { const s = await prisma.saasSubscription.update({ where: { id }, data: { currentPeriodStart: ps, currentPeriodEnd: pe, renewsAt: ra } }); return this.mapSub(s); }
  async suspendSubscription(id: string): Promise<void> { await prisma.saasSubscription.update({ where: { id }, data: { status: "SUSPENDED" } }); }
  async reactivateSubscription(id: string, ps: Date, pe: Date): Promise<SaasSubscription> { const s = await prisma.saasSubscription.update({ where: { id }, data: { status: "ACTIVE", currentPeriodStart: ps, currentPeriodEnd: pe } }); return this.mapSub(s); }
  async cancelSubscription(id: string): Promise<void> { await prisma.saasSubscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } }); }

  async createInvoice(input: { organisationId: string; hotelId?: string | null; subscriptionId: string; number: string; amount: number; taxAmount: number; total: number; currency: string; vatRate: number; dueAt?: Date | null }): Promise<SaasInvoice> {
    const i = await prisma.saasInvoice.create({ data: { organisationId: input.organisationId, hotelId: input.hotelId ?? null, subscriptionId: input.subscriptionId, number: input.number, status: "PENDING", amount: input.amount, taxAmount: input.taxAmount, total: input.total, currency: input.currency, vatRate: input.vatRate, dueAt: input.dueAt ?? null } });
    return this.mapInv(i);
  }
  async listInvoices(org?: string, status?: string): Promise<SaasInvoice[]> {
    const rows = await prisma.saasInvoice.findMany({ where: { ...(org ? { organisationId: org } : {}), ...(status ? { status } : {}) }, orderBy: { issuedAt: "desc" } });
    return rows.map((i) => this.mapInv(i));
  }
  async markInvoicePaid(invoiceId: string): Promise<void> { await prisma.saasInvoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt: new Date() } }); }
  async nextInvoiceNumber(): Promise<string> {
    const count = await prisma.saasInvoice.count();
    return `SAAS-${String(count + 1).padStart(5, "0")}`;
  }

  async createPayment(input: { organisationId: string; hotelId?: string | null; invoiceId?: string | null; subscriptionId?: string | null; providerKey: string; amount: number; currency: string; providerRef?: string | null; status?: string }): Promise<SaasPayment> {
    const p = await prisma.saasPayment.create({ data: { organisationId: input.organisationId, hotelId: input.hotelId ?? null, invoiceId: input.invoiceId ?? null, subscriptionId: input.subscriptionId ?? null, providerKey: input.providerKey, amount: input.amount, currency: input.currency, status: input.status ?? "PENDING", providerRef: input.providerRef ?? null } });
    return this.mapPay(p);
  }
  async listPayments(org?: string): Promise<SaasPayment[]> {
    const rows = await prisma.saasPayment.findMany({ where: org ? { organisationId: org } : {}, orderBy: { createdAt: "desc" } });
    return rows.map((p) => this.mapPay(p));
  }
  async updatePaymentStatus(paymentId: string, status: string, providerRef?: string | null): Promise<void> {
    await prisma.saasPayment.update({ where: { id: paymentId }, data: { status, ...(providerRef ? { providerRef } : {}) } });
  }

  async createManualPayment(input: CreateManualPaymentInput): Promise<SaasManualPayment> {
    const m = await prisma.saasManualPayment.create({ data: { organisationId: input.organisationId, hotelId: input.hotelId ?? null, subscriptionId: input.subscriptionId, methodKey: input.methodKey, amount: input.amount, currency: input.currency, proofType: input.proofType ?? null, proofUrl: input.proofUrl ?? null, bankRef: input.bankRef ?? null, comment: input.comment ?? null } });
    return this.mapMp(m);
  }
  async listManualPayments(status?: string): Promise<SaasManualPayment[]> {
    const rows = await prisma.saasManualPayment.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" } });
    return rows.map((m) => this.mapMp(m));
  }
  async getManualPayment(id: string): Promise<SaasManualPayment | null> { const m = await prisma.saasManualPayment.findUnique({ where: { id } }); return m ? this.mapMp(m) : null; }
  async reviewManualPayment(id: string, decision: "APPROVE" | "REJECT" | "NEEDS_PROOF", comment?: string | null, reviewedBy?: string): Promise<void> {
    await prisma.saasManualPayment.update({ where: { id }, data: { status: decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "NEEDS_PROOF", reviewComment: comment ?? null, reviewedBy: reviewedBy ?? null, reviewedAt: new Date() } });
  }

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<SaasPaymentMethod> {
    const m = await prisma.saasPaymentMethod.create({ data: { methodKey: input.methodKey, name: input.name, type: input.type ?? "AUTO", countries: input.countries ?? [], currencies: input.currencies ?? [], plans: input.plans ?? [], hotelIds: input.hotelIds ?? [], config: input.config ? json(input.config) : undefined } });
    return this.mapMeth(m);
  }
  async listPaymentMethods(type?: string): Promise<SaasPaymentMethod[]> {
    const rows = await prisma.saasPaymentMethod.findMany({ where: type ? { type } : {}, orderBy: { name: "asc" } });
    return rows.map((m) => this.mapMeth(m));
  }
  async setPaymentMethodActive(methodKey: string, isActive: boolean): Promise<void> { await prisma.saasPaymentMethod.update({ where: { methodKey }, data: { isActive } }); }

  async createCoupon(input: CreateCouponInput): Promise<SaasCoupon> {
    const c = await prisma.saasCoupon.create({ data: { code: input.code, type: input.type ?? "PERCENT", value: input.value, maxUses: input.maxUses ?? null, planCodes: input.planCodes ?? [], expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
    return this.mapCoupon(c);
  }
  async getCoupon(code: string): Promise<SaasCoupon | null> { const c = await prisma.saasCoupon.findUnique({ where: { code } }); return c ? this.mapCoupon(c) : null; }
  async consumeCoupon(couponId: string): Promise<void> { await prisma.saasCoupon.update({ where: { id: couponId }, data: { used: { increment: 1 } } }); }

  async orgExists(org: string): Promise<boolean> { const o = await prisma.organisation.findUnique({ where: { id: org } }); return o !== null; }

  private mapSub(s: { id: string; organisationId: string; hotelId: string | null; planId: string; status: string; billingCycle: string; startsAt: Date; trialEndsAt: Date | null; currentPeriodStart: Date; currentPeriodEnd: Date; renewsAt: Date | null; cancelledAt: Date | null; price: number; currency: string; autoRenew: boolean }): SaasSubscription {
    return { id: s.id, organisationId: s.organisationId, hotelId: s.hotelId, planId: s.planId, status: s.status, billingCycle: s.billingCycle, startsAt: s.startsAt, trialEndsAt: s.trialEndsAt, currentPeriodStart: s.currentPeriodStart, currentPeriodEnd: s.currentPeriodEnd, renewsAt: s.renewsAt, cancelledAt: s.cancelledAt, price: s.price, currency: s.currency, autoRenew: s.autoRenew };
  }
  private mapInv(i: { id: string; organisationId: string; hotelId: string | null; subscriptionId: string; number: string; status: string; amount: number; taxAmount: number; total: number; currency: string; vatRate: import("@prisma/client").Prisma.Decimal; issuedAt: Date; dueAt: Date | null; paidAt: Date | null }): SaasInvoice {
    return { id: i.id, organisationId: i.organisationId, hotelId: i.hotelId, subscriptionId: i.subscriptionId, number: i.number, status: i.status, amount: i.amount, taxAmount: i.taxAmount, total: i.total, currency: i.currency, vatRate: i.vatRate.toNumber(), issuedAt: i.issuedAt, dueAt: i.dueAt, paidAt: i.paidAt };
  }
  private mapPay(p: { id: string; organisationId: string; hotelId: string | null; invoiceId: string | null; subscriptionId: string | null; providerKey: string; amount: number; currency: string; status: string; providerRef: string | null; error: string | null; metadata: unknown }): SaasPayment {
    return { id: p.id, organisationId: p.organisationId, hotelId: p.hotelId, invoiceId: p.invoiceId, subscriptionId: p.subscriptionId, providerKey: p.providerKey, amount: p.amount, currency: p.currency, status: p.status, providerRef: p.providerRef, error: p.error, metadata: p.metadata as Record<string, unknown> | null };
  }
  private mapMp(m: { id: string; organisationId: string; hotelId: string | null; subscriptionId: string; invoiceId: string | null; methodKey: string; amount: number; currency: string; proofType: string | null; proofUrl: string | null; bankRef: string | null; comment: string | null; status: string; reviewComment: string | null; reviewedBy: string | null; reviewedAt: Date | null }): SaasManualPayment {
    return { id: m.id, organisationId: m.organisationId, hotelId: m.hotelId, subscriptionId: m.subscriptionId, invoiceId: m.invoiceId, methodKey: m.methodKey, amount: m.amount, currency: m.currency, proofType: m.proofType, proofUrl: m.proofUrl, bankRef: m.bankRef, comment: m.comment, status: m.status, reviewComment: m.reviewComment, reviewedBy: m.reviewedBy, reviewedAt: m.reviewedAt };
  }
  private mapMeth(m: { id: string; methodKey: string; name: string; type: string; isActive: boolean; countries: string[]; currencies: string[]; plans: string[]; hotelIds: string[]; config: unknown }): SaasPaymentMethod {
    return { id: m.id, methodKey: m.methodKey, name: m.name, type: m.type, isActive: m.isActive, countries: m.countries, currencies: m.currencies, plans: m.plans, hotelIds: m.hotelIds, config: m.config as Record<string, unknown> | null };
  }
  private mapCoupon(c: { id: string; code: string; type: string; value: number; maxUses: number | null; used: number; planCodes: string[]; expiresAt: Date | null; isActive: boolean }): SaasCoupon {
    return { id: c.id, code: c.code, type: c.type, value: c.value, maxUses: c.maxUses, used: c.used, planCodes: c.planCodes, expiresAt: c.expiresAt, isActive: c.isActive };
  }
}
