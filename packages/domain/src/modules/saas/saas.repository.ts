/**
 * Module 32 — Billing SaaS : port de persistance.
 */
import type {
  CreateCouponInput,
  CreateManualPaymentInput,
  CreatePaymentMethodInput,
  CreatePlanInput,
  CreateSubscriptionInput,
  SaasCoupon,
  SaasInvoice,
  SaasManualPayment,
  SaasPayment,
  SaasPaymentMethod,
  SaasPlan,
  SaasSubscription,
} from "./saas.types.js";

export interface SaasRepository {
  // Plans
  createPlan(input: CreatePlanInput): Promise<SaasPlan>;
  listPlans(includeInactive?: boolean): Promise<SaasPlan[]>;
  getPlanByCode(code: string): Promise<SaasPlan | null>;
  setPlanActive(planId: string, isActive: boolean): Promise<void>;

  // Abonnements
  createSubscription(input: CreateSubscriptionInput): Promise<SaasSubscription>;
  listSubscriptions(status?: string): Promise<SaasSubscription[]>;
  getSubscription(subscriptionId: string): Promise<SaasSubscription | null>;
  getSubscriptionByOrg(organisationId: string): Promise<SaasSubscription | null>;
  setSubscriptionStatus(subscriptionId: string, status: string): Promise<void>;
  renewSubscription(subscriptionId: string, periodStart: Date, periodEnd: Date, renewsAt: Date): Promise<SaasSubscription>;
  suspendSubscription(subscriptionId: string): Promise<void>;
  reactivateSubscription(subscriptionId: string, periodStart: Date, periodEnd: Date): Promise<SaasSubscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;

  // Factures
  createInvoice(input: { organisationId: string; hotelId?: string | null; subscriptionId: string; number: string; amount: number; taxAmount: number; total: number; currency: string; vatRate: number; dueAt?: Date | null }): Promise<SaasInvoice>;
  listInvoices(organisationId?: string, status?: string): Promise<SaasInvoice[]>;
  markInvoicePaid(invoiceId: string): Promise<void>;
  nextInvoiceNumber(): Promise<string>;

  // Paiements automatiques
  createPayment(input: { organisationId: string; hotelId?: string | null; invoiceId?: string | null; subscriptionId?: string | null; providerKey: string; amount: number; currency: string; providerRef?: string | null; status?: string }): Promise<SaasPayment>;
  listPayments(organisationId?: string): Promise<SaasPayment[]>;
  updatePaymentStatus(paymentId: string, status: string, providerRef?: string | null): Promise<void>;

  // Paiements manuels
  createManualPayment(input: CreateManualPaymentInput): Promise<SaasManualPayment>;
  listManualPayments(status?: string): Promise<SaasManualPayment[]>;
  getManualPayment(paymentId: string): Promise<SaasManualPayment | null>;
  reviewManualPayment(paymentId: string, decision: "APPROVE" | "REJECT" | "NEEDS_PROOF", comment?: string | null, reviewedBy?: string): Promise<void>;

  // Moyens de paiement
  createPaymentMethod(input: CreatePaymentMethodInput): Promise<SaasPaymentMethod>;
  listPaymentMethods(type?: string): Promise<SaasPaymentMethod[]>;
  setPaymentMethodActive(methodKey: string, isActive: boolean): Promise<void>;

  // Coupons
  createCoupon(input: CreateCouponInput): Promise<SaasCoupon>;
  getCoupon(code: string): Promise<SaasCoupon | null>;
  consumeCoupon(couponId: string): Promise<void>;

  // Organisation
  orgExists(organisationId: string): Promise<boolean>;
}
