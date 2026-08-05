/**
 * Module 32 — Port de paiement Provider-Agnostic.
 *
 * Chaque fournisseur (Stripe, Flutterwave, Paystack, CinetPay, FedaPay, PayPal,
 * Lemon Squeezy, Paddle, Mobile Money...) est un **connecteur indépendant**
 * implémentant ce port. Le service SaaS ne connaît jamais un fournisseur concret :
 * il résout le connecteur par `providerKey`. Open/Closed : ajouter un fournisseur
 * = nouveau connecteur, sans modifier le cœur du SaaS.
 */
export type SaasPaymentGatewayResult = {
  ok: boolean;
  providerRef?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
};

export interface SaasPaymentGateway {
  /** Clé métier du fournisseur (stripe, flutterwave, paystack, ...). */
  readonly providerKey: string;
  readonly label: string;
  /** Initie un paiement. Doit être sûr (pas de throw). */
  charge(input: { amount: number; currency: string; description: string; metadata?: Record<string, unknown> }): Promise<SaasPaymentGatewayResult>;
  /** Vérifie un paiement. */
  verify(providerRef: string): Promise<SaasPaymentGatewayResult>;
}

/** Registre des passerelles par providerKey (résolu dans l'infra). */
export type SaasPaymentGatewayRegistry = Record<string, SaasPaymentGateway>;
