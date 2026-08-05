/**
 * Module 32 — Billing SaaS & Abonnements : types du domaine.
 *
 * **Super Administration uniquement** (modules 32-35) : ce module n'est jamais
 * visible/accessible depuis le portail hôtels ni clients. Cycle de vie des
 * abonnements, plans, coupons, facturation auto, paiements automatiques
 * (provider-agnostic) et manuels (validation par l'admin SaaS).
 */

/** Plan d'abonnement SaaS. */
export interface SaasPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  trialDays: number;
  maxUsers: number;
  maxHotels: number;
  maxRooms: number;
  quotaAi: number;
  quotaEmail: number;
  quotaSms: number;
  quotaWhatsapp: number;
  quotaApi: number;
  modules: string[];
  features?: Record<string, unknown> | null;
  allowedPaymentMethods: string[];
  allowedCountries: string[];
  isActive: boolean;
}

/** Abonnement d'une organisation. */
export interface SaasSubscription {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  planId: string;
  status: string;
  billingCycle: string;
  startsAt: Date;
  trialEndsAt?: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  renewsAt?: Date | null;
  cancelledAt?: Date | null;
  price: number;
  currency: string;
  autoRenew: boolean;
}

/** Facture d'abonnement. */
export interface SaasInvoice {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  subscriptionId: string;
  number: string;
  status: string;
  amount: number;
  taxAmount: number;
  total: number;
  currency: string;
  vatRate: number;
  issuedAt: Date;
  dueAt?: Date | null;
  paidAt?: Date | null;
}

/** Paiement automatique. */
export interface SaasPayment {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  invoiceId?: string | null;
  subscriptionId?: string | null;
  providerKey: string;
  amount: number;
  currency: string;
  status: string;
  providerRef?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Paiement manuel. */
export interface SaasManualPayment {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  subscriptionId: string;
  invoiceId?: string | null;
  methodKey: string;
  amount: number;
  currency: string;
  proofType?: string | null;
  proofUrl?: string | null;
  bankRef?: string | null;
  comment?: string | null;
  status: string;
  reviewComment?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
}

/** Moyen de paiement configurable. */
export interface SaasPaymentMethod {
  id: string;
  methodKey: string;
  name: string;
  type: string;
  isActive: boolean;
  countries: string[];
  currencies: string[];
  plans: string[];
  hotelIds: string[];
  config?: Record<string, unknown> | null;
}

/** Coupon / promotion. */
export interface SaasCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses?: number | null;
  used: number;
  planCodes: string[];
  expiresAt?: Date | null;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string | null;
  price?: number;
  currency?: string;
  billingCycle?: string;
  trialDays?: number;
  maxUsers?: number;
  maxHotels?: number;
  maxRooms?: number;
  quotaAi?: number;
  quotaEmail?: number;
  quotaSms?: number;
  quotaWhatsapp?: number;
  quotaApi?: number;
  modules?: string[];
  features?: Record<string, unknown>;
  allowedPaymentMethods?: string[];
  allowedCountries?: string[];
}

export interface CreateSubscriptionInput {
  organisationId: string;
  hotelId?: string | null;
  planCode: string;
  billingCycle?: string;
  couponCode?: string | null;
}

export interface CreateManualPaymentInput {
  organisationId: string;
  hotelId?: string | null;
  subscriptionId: string;
  methodKey: string;
  amount: number;
  currency: string;
  proofType?: string | null;
  proofUrl?: string | null;
  bankRef?: string | null;
  comment?: string | null;
}

export interface ReviewManualPaymentInput {
  decision: "APPROVE" | "REJECT" | "NEEDS_PROOF";
  comment?: string | null;
}

export interface CreatePaymentMethodInput {
  methodKey: string;
  name: string;
  type?: string;
  countries?: string[];
  currencies?: string[];
  plans?: string[];
  hotelIds?: string[];
  config?: Record<string, unknown>;
}

export interface CreateCouponInput {
  code: string;
  type?: string;
  value: number;
  maxUses?: number | null;
  planCodes?: string[];
  expiresAt?: Date | string | null;
}

/** Contexte d'un paiement automatique (port provider-agnostic). */
export interface PaymentContext {
  amount: number;
  currency: string;
  invoiceNumber: string;
  metadata?: Record<string, unknown>;
}
