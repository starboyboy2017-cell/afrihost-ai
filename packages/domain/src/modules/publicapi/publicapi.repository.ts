/**
 * Module 30 — API Publique & Marketplace : port de persistance.
 */
import type {
  ApiAccessLog,
  ApiApp,
  ApiCredential,
  ApiMarketplaceApp,
  ApiWebhook,
  ApiWebhookDelivery,
  CreateApiAppInput,
  CreateCredentialInput,
  PublishMarketplaceInput,
  RegisterWebhookInput,
} from "./publicapi.types.js";

export interface PublicApiRepository {
  // Applications
  createApp(input: CreateApiAppInput & { ownerOrgId?: string | null; ownerUserId?: string | null }): Promise<ApiApp>;
  listApps(ownerOrgId: string): Promise<ApiApp[]>;
  getApp(appId: string): Promise<ApiApp | null>;

  // Credentials
  createCredential(appId: string, input: CreateCredentialInput & { clientId: string; secretHash: string }): Promise<ApiCredential>;
  listCredentials(appId: string): Promise<ApiCredential[]>;
  revokeCredential(credentialId: string): Promise<void>;
  authenticate(clientId: string, secretHash: string): Promise<ApiCredential | null>;

  // Webhooks
  registerWebhook(input: RegisterWebhookInput): Promise<ApiWebhook>;
  listWebhooks(appId: string): Promise<ApiWebhook[]>;
  setWebhookActive(webhookId: string, isActive: boolean): Promise<void>;
  findWebhooks(hotelId: string, event: string): Promise<ApiWebhook[]>;
  enqueueDelivery(webhookId: string, event: string, payload: Record<string, unknown>): Promise<ApiWebhookDelivery>;
  claimDueDeliveries(limit?: number): Promise<ApiWebhookDelivery[]>;
  markDeliverySuccess(deliveryId: string, response?: string): Promise<void>;
  markDeliveryFailed(deliveryId: string, error: string, retryAt?: Date): Promise<void>;

  // Marketplace
  publishMarketplace(input: PublishMarketplaceInput): Promise<ApiMarketplaceApp>;
  listMarketplace(publishedOnly?: boolean): Promise<ApiMarketplaceApp[]>;
  incrementInstalls(marketplaceId: string): Promise<void>;

  // Journalisation
  logAccess(input: { appId?: string | null; credentialId?: string | null; hotelId?: string | null; method: string; path: string; status: number; latencyMs?: number | null; ip?: string | null; userAgent?: string | null }): Promise<ApiAccessLog>;
  countRequestsSince(credentialId: string, since: Date): Promise<number>;
  listLogs(appId: string, limit?: number): Promise<ApiAccessLog[]>;
}
