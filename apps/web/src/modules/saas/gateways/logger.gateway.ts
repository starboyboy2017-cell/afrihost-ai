/**
 * Module 32 — Passerelle de paiement de démonstration (provider-agnostic).
 *
 * Chaque fournisseur (Stripe, Flutterwave, Paystack, CinetPay, FedaPay, PayPal,
 * Mobile Money...) est un connecteur indépendant implémentant `SaasPaymentGateway`.
 * Ici : journalise et simule un succès (démo hors-ligne).
 */
import type { SaasPaymentGateway, SaasPaymentGatewayResult } from "@afrihost/domain";

export class LoggerPaymentGateway implements SaasPaymentGateway {
  readonly providerKey: string;
  readonly label: string;

  constructor(providerKey: string, label: string) {
    this.providerKey = providerKey;
    this.label = label;
  }

  async charge(input: { amount: number; currency: string; description: string }): Promise<SaasPaymentGatewayResult> {
    // eslint-disable-next-line no-console
    console.log(`[saas-payment:${this.providerKey}] ${input.description} — ${input.amount} ${input.currency}`);
    return { ok: true, providerRef: `${this.providerKey}-${Date.now()}`, metadata: { demo: true } };
  }

  async verify(providerRef: string): Promise<SaasPaymentGatewayResult> {
    return { ok: true, providerRef };
  }
}
