/**
 * Module 23 — Adaptateur d'expédition de démonstration (provider-agnostic).
 *
 * Implémente le port `NotificationSender`. En production, des adaptateurs
 * Resend/Brevo/SES/SendGrid (EMAIL), Twilio/Infobip/Vonage/Orange/MTN (SMS),
 * Meta/360Dialog (WHATSAPP), FCM (PUSH) implémenteraient exactement la même
 * interface — le service métier n'est jamais modifié.
 *
 * Ici : journalise l'envoi et renvoie un statut DELIVERED simulé, sans appeler
 * de service externe. Utilisé en local / hors connexion fournisseur.
 */
import type { NotificationProvider, NotificationSender, SendResult } from "@afrihost/domain";

export class LoggerSender implements NotificationSender {
  readonly channel: string;

  constructor(channel: string) {
    this.channel = channel;
  }

  async send(provider: NotificationProvider, payload: { to: string; subject?: string | null; body: string }): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.log(`[notifications:${this.channel}] ${provider.name} → ${payload.to} :: ${payload.subject ? `${payload.subject} | ` : ""}${payload.body.slice(0, 120)}`);
    return { status: "DELIVERED", providerRef: `demo-${provider.providerKey}-${Date.now()}` };
  }
}
