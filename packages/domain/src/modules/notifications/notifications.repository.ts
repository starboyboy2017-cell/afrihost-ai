/**
 * Module 23 — Notifications multicanales : port de persistance.
 */
import type {
  CreateNotificationCampaignInput,
  CreateProviderInput,
  CreateTemplateInput,
  CreateTriggerInput,
  NotificationCampaign,
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
  NotificationProvider,
  NotificationSend,
  NotificationStatus,
  NotificationTemplate,
  NotificationTrigger,
  TemplateVars,
} from "./notifications.types.js";

export interface EnqueueInput {
  hotelId: string;
  channel: NotificationChannel;
  eventType?: NotificationEventType | null;
  templateCode?: string | null;
  providerId?: string | null;
  recipientType: string;
  recipientId: string;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  priority: NotificationPriority;
  maxAttempts?: number;
  payload?: Record<string, unknown> | null;
  scheduledAt?: Date | null;
  notificationId?: string | null;
  campaignId?: string | null;
}

export interface NotificationsRepository {
  // Fournisseurs
  createProvider(hotelId: string, input: CreateProviderInput): Promise<NotificationProvider>;
  listProviders(hotelId: string): Promise<NotificationProvider[]>;
  getProvider(hotelId: string, providerId: string): Promise<NotificationProvider | null>;
  findDefaultProvider(hotelId: string, channel: NotificationChannel): Promise<NotificationProvider | null>;
  setProviderActive(hotelId: string, providerId: string, isActive: boolean): Promise<void>;
  setProviderDefault(hotelId: string, providerId: string): Promise<void>;

  // Templates
  createTemplate(hotelId: string, input: CreateTemplateInput): Promise<NotificationTemplate>;
  listTemplates(hotelId: string): Promise<NotificationTemplate[]>;
  getTemplate(hotelId: string, channel: NotificationChannel, code: string, locale?: string): Promise<NotificationTemplate | null>;

  // Déclencheurs
  createTrigger(hotelId: string, input: CreateTriggerInput): Promise<NotificationTrigger>;
  listTriggers(hotelId: string): Promise<NotificationTrigger[]>;
  setTriggerActive(hotelId: string, triggerId: string, isActive: boolean): Promise<void>;
  findTriggers(hotelId: string, eventType: NotificationEventType): Promise<NotificationTrigger[]>;

  // Campagnes
  createCampaign(hotelId: string, input: CreateNotificationCampaignInput & { createdBy?: string }): Promise<NotificationCampaign>;
  listCampaigns(hotelId: string): Promise<NotificationCampaign[]>;
  getCampaign(hotelId: string, campaignId: string): Promise<NotificationCampaign | null>;
  setCampaignStatus(hotelId: string, campaignId: string, status: string): Promise<void>;

  // Envois (file d'attente)
  enqueue(hotelId: string, input: EnqueueInput): Promise<NotificationSend>;
  listSends(hotelId: string, status?: NotificationStatus, limit?: number): Promise<NotificationSend[]>;
  getSend(hotelId: string, sendId: string): Promise<NotificationSend | null>;
  claimDueSends(hotelId: string, now: Date, limit?: number): Promise<NotificationSend[]>;
  markProcessing(hotelId: string, sendId: string): Promise<void>;
  markSent(hotelId: string, sendId: string, providerRef?: string | null): Promise<void>;
  markDelivered(hotelId: string, sendId: string): Promise<void>;
  markRead(hotelId: string, sendId: string): Promise<void>;
  markFailed(hotelId: string, sendId: string, error: string, retryAt?: Date | null): Promise<void>;
  scheduleRetry(hotelId: string, sendId: string, retryAt: Date): Promise<void>;

  // Compat : table Notification
  createNotification(hotelId: string, input: { recipientType: string; recipientId: string; channel: NotificationChannel; templateCode: string; payload?: Record<string, unknown> | null }): Promise<{ id: string }>;

  // Audit d'envoi (portée hôtel pour vérifier des événements)
  guestExists(hotelId: string, guestId: string): Promise<boolean>;
}
