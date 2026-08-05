/**
 * Module 23 — Port d'expédition agnostique fournisseur (provider-agnostic).
 *
 * Les adaptateurs d'infrastructure (Resend, Brevo, SES, SendGrid, Twilio,
 * Infobip, Vonage, Orange/MTN API, Meta WhatsApp, FCM...) implémentent ce port.
 * Le service métier ne connaît jamais le fournisseur concret : il résout le
 * fournisseur configuré par l'hôtel et délègue via ce port.
 */
import type { NotificationProvider } from "./notifications.types.js";

export type SendResult = {
  providerRef?: string | null;
  status?: "SENT" | "DELIVERED" | "READ" | "FAILED";
};

export interface NotificationSender {
  /** Canal pris en charge. */
  readonly channel: string;
  /** Envoie une notification. Doit être sûr (ne pas lever sur échec fournisseur). */
  send(provider: NotificationProvider, payload: { to: string; subject?: string | null; body: string; from?: string | null; replyTo?: string | null }): Promise<SendResult>;
}

/** Registre des expéditeurs par providerKey (résolu dans l'infra). */
export type SenderRegistry = Record<string, NotificationSender>;
