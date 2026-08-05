/**
 * Module 30 — API Publique & Marketplace : types du domaine.
 *
 * API REST (GraphQL prévu) pour développeurs tiers : OAuth2, API Keys, JWT,
 * Webhooks, versionnement, rate limiting, journalisation, sandbox, marketplace.
 * Toute donnée est filtrée par RLS/RBAC et isolée multi-hôtel.
 */

/** Application tierce. */
export interface ApiApp {
  id: string;
  name: string;
  description?: string | null;
  ownerOrgId?: string | null;
  ownerUserId?: string | null;
  environment: string;
  isActive: boolean;
}

/** Crédential (API key ou client OAuth2). */
export interface ApiCredential {
  id: string;
  appId: string;
  kind: string;
  clientId: string;
  scopes: string[];
  hotels: string[];
  environment: string;
  rateLimitPerMinute: number;
  isActive: boolean;
  expiresAt?: Date | null;
  /** Interne : hash du secret, jamais exposé aux clients. */
  secretHash?: string | null;
}

/** Webhook. */
export interface ApiWebhook {
  id: string;
  appId: string;
  hotelId?: string | null;
  url: string;
  events: string[];
  isActive: boolean;
}

/** Livraison de webhook. */
export interface ApiWebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  attempts: number;
  error?: string | null;
}

/** Application du marketplace. */
export interface ApiMarketplaceApp {
  id: string;
  appId: string;
  name: string;
  category: string;
  summary?: string | null;
  iconUrl?: string | null;
  version: string;
  isPublished: boolean;
  installs: number;
}

/** Log d'accès API. */
export interface ApiAccessLog {
  id: string;
  appId?: string | null;
  credentialId?: string | null;
  hotelId?: string | null;
  method: string;
  path: string;
  status: number;
  latencyMs?: number | null;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateApiAppInput {
  name: string;
  description?: string | null;
  environment?: string;
}

export interface CreateCredentialInput {
  appId?: string;
  kind?: string;
  scopes?: string[];
  hotels?: string[];
  rateLimitPerMinute?: number;
}

export interface RegisterWebhookInput {
  appId: string;
  hotelId?: string | null;
  url: string;
  events: string[];
}

export interface PublishMarketplaceInput {
  appId: string;
  name: string;
  category: string;
  summary?: string | null;
  iconUrl?: string | null;
}

/** Résultat d'authentification d'une requête API. */
export interface AuthenticatedRequest {
  appId: string;
  credentialId: string;
  scopes: string[];
  hotels: string[];
}
