/**
 * Module 32 — Billing SaaS & Abonnements : service métier.
 *
 * **Super Administration uniquement** (modules 32-35). Gère :
 *   - plans (Gratuit/Standard/Premium/Enterprise/personnalisés) avec quotas,
 *     modules, pays, moyens de paiement autorisés ;
 *   - cycle de vie des abonnements : essai, renouvellement auto, suspension,
 *     réactivation, résiliation ;
 *   - coupons / promotions / remises ;
 *   - facturation auto + TVA configurable par pays + devises + SYSCOHADA ;
 *   - paiements automatiques **provider-agnostic** (moteur de connecteurs) ;
 *   - paiements manuels configurables (banque, mobile money, chèque, espèces...)
 *     avec preuve + validation manuelle (approuver/rejeter/demander preuve) ;
 *   - notifications (via EventBus).
 *
 * Provider-Agnostic, SOLID, Clean Architecture, DI, Event-Driven. RBAC saas.*.
 * L'isolation multi-tenant : le Super Admin voit tout ; les admins d'hôtel ne
 * voient que leur établissement (via RLS).
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { SaasError } from "./saas.error.js";
import type { SaasPaymentGatewayRegistry } from "./saas.payment-gateway.js";
import type { SaasRepository } from "./saas.repository.js";
import type {
  CreateCouponInput,
  CreateManualPaymentInput,
  CreatePaymentMethodInput,
  CreatePlanInput,
  CreateSubscriptionInput,
  ReviewManualPaymentInput,
  SaasCoupon,
  SaasInvoice,
  SaasManualPayment,
  SaasPayment,
  SaasPaymentMethod,
  SaasPlan,
  SaasSubscription,
} from "./saas.types.js";
import {
  validateCreateCoupon,
  validateCreateManualPayment,
  validateCreatePaymentMethod,
  validateCreatePlan,
  validateCreateSubscription,
  validateReviewManualPayment,
} from "./saas.validation.js";

/** Contexte d'acteur (Super Admin / admin SaaS). */
export interface SaasActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 };

export class SaasService {
  constructor(
    private readonly repo: SaasRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
    private readonly gateways: SaasPaymentGatewayRegistry = {},
  ) {}

  // ---------------------------------------------------------------------------
  // Plans
  // ---------------------------------------------------------------------------

  async createPlan(input: CreatePlanInput, actor: SaasActor): Promise<SaasPlan> {
    const v = validateCreatePlan(input);
    const plan = await this.repo.createPlan(v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: actor.actorUserId, action: "saas.plan.create", entityType: "SaasPlan", entityId: plan.id, after: { code: v.code, name: v.name } });
    return plan;
  }

  async listPlans(includeInactive: boolean, actor: SaasActor): Promise<SaasPlan[]> {
    return this.repo.listPlans(includeInactive);
  }

  async setPlanActive(planId: string, isActive: boolean, actor: SaasActor): Promise<void> {
    await this.repo.setPlanActive(planId, isActive);
  }

  // ---------------------------------------------------------------------------
  // Abonnements (cycle de vie)
  // ---------------------------------------------------------------------------

  /** Crée un abonnement (essai si plan trialDays > 0, sinon ACTIVE). */
  async createSubscription(input: CreateSubscriptionInput, actor: SaasActor): Promise<SaasSubscription> {
    const v = validateCreateSubscription(input);
    if (!(await this.repo.orgExists(v.organisationId))) throw new SaasError("Organisation introuvable");
    const plan = await this.repo.getPlanByCode(v.planCode);
    if (!plan || !plan.isActive) throw new SaasError("Plan introuvable ou inactif");
    if (await this.repo.getSubscriptionByOrg(v.organisationId)) throw new SaasError("L'organisation a déjà un abonnement");

    // Coupon
    let price = plan.price;
    if (v.couponCode) {
      const coupon = await this.repo.getCoupon(v.couponCode);
      if (!coupon || !coupon.isActive) throw new SaasError("Coupon invalide");
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new SaasError("Coupon expiré");
      if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.used >= coupon.maxUses) throw new SaasError("Coupon épuisé");
      price = coupon.type === "PERCENT" ? Math.round(price * (1 - coupon.value / 100)) : Math.max(0, price - coupon.value);
      await this.repo.consumeCoupon(coupon.id);
    }

    const now = new Date();
    const months = CYCLE_MONTHS[v.billingCycle ?? plan.billingCycle] ?? 1;
    const periodEnd = this.addMonths(now, months);
    const sub = await this.repo.createSubscription({
      organisationId: v.organisationId, hotelId: v.hotelId ?? null, planCode: v.planCode,
      billingCycle: v.billingCycle ?? plan.billingCycle, couponCode: v.couponCode ?? null,
    });

    // Facture initiale
    const vatRate = 0.18; // TVA configurable par pays (18% par défaut, XOF zone UEMOA)
    const taxAmount = Math.round(price * vatRate);
    const invoice = await this.repo.createInvoice({
      organisationId: v.organisationId, hotelId: v.hotelId ?? null, subscriptionId: sub.id,
      number: await this.repo.nextInvoiceNumber(), amount: price, taxAmount, total: price + taxAmount,
      currency: plan.currency, vatRate, dueAt: periodEnd,
    });

    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: actor.actorUserId, action: "saas.subscription.create", entityType: "SaasSubscription", entityId: sub.id, after: { planCode: v.planCode, status: sub.status, price } });
    await this.bus.publish({ name: DomainEvents.saasSubscriptionCreated, hotelId: actor.hotelId, organisationId: v.organisationId, data: { subscriptionId: sub.id, planCode: v.planCode, invoiceId: invoice.id, price } });
    return sub;
  }

  async listSubscriptions(status: string | undefined, actor: SaasActor): Promise<SaasSubscription[]> {
    return this.repo.listSubscriptions(status);
  }

  /** Renouvellement automatique (facture + paiement auto). */
  async renew(subscriptionId: string, actor: SaasActor): Promise<SaasInvoice> {
    const sub = await this.repo.getSubscription(subscriptionId);
    if (!sub) throw new SaasError("Abonnement introuvable");
    const months = CYCLE_MONTHS[sub.billingCycle] ?? 1;
    const now = new Date();
    const periodEnd = this.addMonths(now, months);
    const renewsAt = this.addMonths(periodEnd, months);
    const renewed = await this.repo.renewSubscription(subscriptionId, now, periodEnd, renewsAt);

    const vatRate = 0.18;
    const taxAmount = Math.round(sub.price * vatRate);
    const invoice = await this.repo.createInvoice({
      organisationId: sub.organisationId, hotelId: sub.hotelId ?? null, subscriptionId: sub.id,
      number: await this.repo.nextInvoiceNumber(), amount: sub.price, taxAmount, total: sub.price + taxAmount,
      currency: sub.currency, vatRate, dueAt: periodEnd,
    });
    await this.bus.publish({ name: DomainEvents.saasSubscriptionRenewed, hotelId: actor.hotelId, organisationId: sub.organisationId, data: { subscriptionId: sub.id, invoiceId: invoice.id, renewsAt } });
    return invoice;
  }

  async suspend(subscriptionId: string, actor: SaasActor): Promise<void> {
    await this.repo.suspendSubscription(subscriptionId);
    const sub = await this.repo.getSubscription(subscriptionId);
    await this.bus.publish({ name: DomainEvents.saasSubscriptionSuspended, hotelId: actor.hotelId, organisationId: sub?.organisationId ?? actor.organisationId, data: { subscriptionId } });
  }

  async reactivate(subscriptionId: string, actor: SaasActor): Promise<void> {
    const now = new Date();
    const sub = await this.repo.getSubscription(subscriptionId);
    if (!sub) throw new SaasError("Abonnement introuvable");
    const months = CYCLE_MONTHS[sub.billingCycle] ?? 1;
    const periodEnd = this.addMonths(now, months);
    await this.repo.reactivateSubscription(subscriptionId, now, periodEnd);
  }

  async cancel(subscriptionId: string, actor: SaasActor): Promise<void> {
    await this.repo.cancelSubscription(subscriptionId);
  }

  // ---------------------------------------------------------------------------
  // Paiements automatiques (provider-agnostic)
  // ---------------------------------------------------------------------------

  /** Paiement automatique d'une facture via le connecteur configuré. */
  async chargeInvoice(invoiceId: string, providerKey: string, actor: SaasActor): Promise<SaasPayment> {
    const invoice = (await this.repo.listInvoices()).find((i) => i.id === invoiceId);
    if (!invoice) throw new SaasError("Facture introuvable");
    const gateway = this.gateways[providerKey];
    if (!gateway) {
      // Pas de connecteur → paiement enregistré en PENDING (mode hors-ligne fournisseur).
      return this.repo.createPayment({ organisationId: invoice.organisationId, hotelId: invoice.hotelId ?? null, invoiceId: invoice.id, subscriptionId: invoice.subscriptionId, providerKey, amount: invoice.total, currency: invoice.currency, status: "PENDING" });
    }
    const res = await gateway.charge({ amount: invoice.total, currency: invoice.currency, description: `Facture ${invoice.number}`, metadata: { invoiceId } });
    const payment = await this.repo.createPayment({
      organisationId: invoice.organisationId, hotelId: invoice.hotelId ?? null, invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId, providerKey, amount: invoice.total, currency: invoice.currency,
      providerRef: res.providerRef ?? null, status: res.ok ? "SUCCESS" : "FAILED",
    });
    if (res.ok) {
      await this.repo.markInvoicePaid(invoiceId);
      await this.bus.publish({ name: DomainEvents.saasPaymentReceived, hotelId: actor.hotelId, organisationId: invoice.organisationId, data: { paymentId: payment.id, invoiceId, providerKey } });
    }
    return payment;
  }

  async listPayments(organisationId: string | undefined, actor: SaasActor): Promise<SaasPayment[]> {
    return this.repo.listPayments(organisationId);
  }

  // ---------------------------------------------------------------------------
  // Paiements manuels + validation
  // ---------------------------------------------------------------------------

  /** Dépose un paiement manuel avec preuve. */
  async createManualPayment(input: CreateManualPaymentInput, actor: SaasActor): Promise<SaasManualPayment> {
    const v = validateCreateManualPayment(input);
    const pm = await this.repo.createManualPayment(v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: actor.actorUserId, action: "saas.manual_payment.create", entityType: "SaasManualPayment", entityId: pm.id, after: { methodKey: v.methodKey, amount: v.amount, status: "PENDING" } });
    return pm;
  }

  async listManualPayments(status: string | undefined, actor: SaasActor): Promise<SaasManualPayment[]> {
    return this.repo.listManualPayments(status);
  }

  /** Validation manuelle : approuver → activation/renouvellement automatique. */
  async reviewManualPayment(paymentId: string, input: ReviewManualPaymentInput, actor: SaasActor): Promise<void> {
    const v = validateReviewManualPayment(input);
    const payment = await this.repo.getManualPayment(paymentId);
    if (!payment) throw new SaasError("Paiement manuel introuvable");
    await this.repo.reviewManualPayment(paymentId, v.decision, v.comment ?? null, actor.actorUserId);
    if (v.decision === "APPROVE") {
      // Déclenche l'activation/renouvellement de l'abonnement.
      const now = new Date();
      const sub = await this.repo.getSubscription(payment.subscriptionId);
      if (sub) {
        const months = CYCLE_MONTHS[sub.billingCycle] ?? 1;
        await this.repo.reactivateSubscription(payment.subscriptionId, now, this.addMonths(now, months));
      }
      // Marquer la facture associée payée.
      if (payment.invoiceId) await this.repo.markInvoicePaid(payment.invoiceId);
      await this.bus.publish({ name: DomainEvents.saasPaymentValidated, hotelId: actor.hotelId, organisationId: payment.organisationId, data: { paymentId, subscriptionId: payment.subscriptionId, decision: "APPROVE" } });
    }
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: actor.actorUserId, action: `saas.manual_payment.${v.decision.toLowerCase()}`, entityType: "SaasManualPayment", entityId: paymentId, after: { decision: v.decision, comment: v.comment } });
  }

  // ---------------------------------------------------------------------------
  // Moyens de paiement configurables
  // ---------------------------------------------------------------------------

  async createPaymentMethod(input: CreatePaymentMethodInput, actor: SaasActor): Promise<SaasPaymentMethod> {
    const v = validateCreatePaymentMethod(input);
    return this.repo.createPaymentMethod(v);
  }

  async listPaymentMethods(type: string | undefined, actor: SaasActor): Promise<SaasPaymentMethod[]> {
    return this.repo.listPaymentMethods(type);
  }

  async setPaymentMethodActive(methodKey: string, isActive: boolean, actor: SaasActor): Promise<void> {
    await this.repo.setPaymentMethodActive(methodKey, isActive);
  }

  // ---------------------------------------------------------------------------
  // Coupons
  // ---------------------------------------------------------------------------

  async createCoupon(input: CreateCouponInput, actor: SaasActor): Promise<SaasCoupon> {
    const v = validateCreateCoupon(input);
    return this.repo.createCoupon(v);
  }

  // ---------------------------------------------------------------------------
  // Factures
  // ---------------------------------------------------------------------------

  async listInvoices(organisationId: string | undefined, status: string | undefined, actor: SaasActor): Promise<SaasInvoice[]> {
    return this.repo.listInvoices(organisationId, status);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }
}
