/**
 * Module 23 — Notifications multicanales : types du domaine.
 *
 * Système **agnostique fournisseur** (provider-agnostic) : aucun code métier ne
 * dépend d'un fournisseur concret (Resend, Twilio, Meta, FCM...). Chaque hôtel
 * configure ses fournisseurs, expéditeurs, domaines, modèles multilingues et
 * règles. L'envoi passe par des adaptateurs optionnels (infra) résolus à partir
 * de la config du fournisseur.
 */

export type NotificationChannel = "WHATSAPP" | "EMAIL" | "SMS" | "PUSH" | "VOICE" | "IN_APP" | "OTHER";
export type NotificationStatus = "QUEUED" | "PROCESSING" | "SENT" | "DELIVERED" | "READ" | "CLICKED" | "FAILED" | "CANCELLED";
export type ProviderType = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "VOICE" | "OTHER";
export type NotificationEventType =
  | "RESERVATION_CONFIRMED" | "RESERVATION_CANCELLED" | "RESERVATION_CREATED"
  | "CHECK_IN" | "CHECK_OUT" | "NO_SHOW"
  | "PAYMENT_RECEIVED" | "INVOICE_PAID"
  | "PROMOTION" | "LOYALTY_POINTS" | "LOYALTY_TIER"
  | "HOUSEKEEPING" | "MAINTENANCE" | "TRANSPORT" | "LAUNDRY"
  | "WELCOME" | "CUSTOM";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

/** Fournisseur configurable par hôtel. */
export interface NotificationProvider {
  id: string;
  hotelId: string;
  name: string;
  channel: NotificationChannel;
  providerType: ProviderType;
  providerKey: string;
  credentials?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  fromAddress?: string | null;
  domain?: string | null;
  replyTo?: string | null;
  isDefault: boolean;
  isActive: boolean;
  rateLimitPerMinute: number;
}

/** Template multilingue. */
export interface NotificationTemplate {
  id: string;
  hotelId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  code: string;
  locale: string;
  subject?: string | null;
  body: string;
  variables: string[];
  isActive: boolean;
}

/** Règle de déclenchement automatique. */
export interface NotificationTrigger {
  id: string;
  hotelId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  templateCode: string;
  condition?: Record<string, unknown> | null;
  priority: NotificationPriority;
  isActive: boolean;
}

/** Campagne programmée. */
export interface NotificationCampaign {
  id: string;
  hotelId: string;
  name: string;
  channel: NotificationChannel;
  templateCode: string;
  segmentId?: string | null;
  audience?: Record<string, unknown> | null;
  scheduleAt?: Date | null;
  status: string;
  sentAt?: Date | null;
  config?: Record<string, unknown> | null;
  createdBy?: string | null;
}

/** Envoi de notification (historique + suivi). */
export interface NotificationSend {
  id: string;
  hotelId: string;
  notificationId?: string | null;
  campaignId?: string | null;
  channel: NotificationChannel;
  eventType?: NotificationEventType | null;
  templateCode?: string | null;
  providerId?: string | null;
  recipientType: string;
  recipientId: string;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  status: NotificationStatus;
  priority: NotificationPriority;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date | null;
  providerRef?: string | null;
  error?: string | null;
  payload?: Record<string, unknown> | null;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateProviderInput {
  name: string;
  channel: NotificationChannel;
  providerType: ProviderType;
  providerKey: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  fromAddress?: string | null;
  domain?: string | null;
  replyTo?: string | null;
  isDefault?: boolean;
  rateLimitPerMinute?: number;
}

export interface CreateTemplateInput {
  channel: NotificationChannel;
  eventType: NotificationEventType;
  code: string;
  locale?: string;
  subject?: string | null;
  body: string;
  variables?: string[];
}

export interface CreateTriggerInput {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  templateCode: string;
  condition?: Record<string, unknown>;
  priority?: NotificationPriority;
}

export interface CreateNotificationCampaignInput {
  name: string;
  channel: NotificationChannel;
  templateCode: string;
  segmentId?: string | null;
  audience?: Record<string, unknown>;
  scheduleAt?: Date | string | null;
  config?: Record<string, unknown>;
}

/** Destinataire d'un envoi. */
export interface NotificationRecipient {
  recipientType: string; // guest | staff
  recipientId: string;
  recipient?: string | null; // email / téléphone / token
}

/** Contexte de variables pour le rendu de template. */
export type TemplateVars = Record<string, unknown>;

/** Demande d'envoi immédiat ou programmé. */
export interface SendNotificationInput {
  channel: NotificationChannel;
  templateCode: string;
  eventType?: NotificationEventType;
  recipient: NotificationRecipient;
  vars?: TemplateVars;
  providerId?: string | null;
  scheduleAt?: Date | string | null;
  priority?: NotificationPriority;
  payload?: Record<string, unknown>;
}

/** Événement métier déclencheur automatique (dispatché par les modules). */
export interface NotificationEventInput {
  hotelId: string;
  organisationId: string;
  eventType: NotificationEventType;
  recipient: NotificationRecipient;
  vars?: TemplateVars;
  reference?: string;
}
