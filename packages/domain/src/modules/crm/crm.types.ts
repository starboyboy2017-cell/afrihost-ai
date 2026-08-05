/**
 * Module 21 — CRM : types du domaine.
 */

/** Canal d'une campagne. */
export type CampaignChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "OTHER";

/** Statut d'une campagne. */
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT" | "PARTIALLY_SENT" | "CANCELLED";

/** Entreprise / agence. */
export interface Company {
  id: string;
  hotelId: string;
  name: string;
  type: string; // CORPORATE, AGENCY, TRAVEL_AGENT, TOUR_OPERATOR
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
}

/** Préférences client. */
export interface GuestPreference {
  id: string;
  hotelId: string;
  guestId: string;
  language?: string | null;
  roomTypeId?: string | null;
  floor?: string | null;
  view?: string | null;
  bedType?: string | null;
  diet?: string | null;
  allergies?: string[];
  favoritePaymentMethod?: string | null;
  birthDate?: Date | null;
  communicationPrefs?: Record<string, unknown> | null;
  custom?: Record<string, unknown> | null;
}

/** Segment de clientèle. */
export interface CustomerSegment {
  id: string;
  hotelId: string;
  name: string;
  description?: string | null;
  criteria?: Record<string, unknown> | null;
  isDynamic: boolean;
  isActive: boolean;
}

/** Campagne marketing. */
export interface Campaign {
  id: string;
  hotelId: string;
  segmentId?: string | null;
  name: string;
  channel: CampaignChannel;
  subject?: string | null;
  messageTemplate: string;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  status: CampaignStatus;
}

/** Interaction client. */
export interface CustomerInteraction {
  id: string;
  hotelId: string;
  guestId: string;
  type: string;
  summary: string;
  detail?: Record<string, unknown> | null;
  sourceModule?: string | null;
}

/** Tâche / note / rappel. */
export interface CustomerTask {
  id: string;
  hotelId: string;
  guestId: string;
  kind: string; // NOTE, TASK, REMINDER
  title: string;
  body?: string | null;
  dueAt?: Date | null;
  done: boolean;
  assignedTo?: string | null;
}

/** Opportunité. */
export interface Opportunity {
  id: string;
  hotelId: string;
  guestId?: string | null;
  companyId?: string | null;
  title: string;
  value?: number | null;
  stage: string;
  expectedDate?: Date | null;
  notes?: string | null;
}

/** Saisie de création d'une entreprise. */
export interface CreateCompanyInput {
  name: string;
  type: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

/** Saisie de préférences. */
export interface SavePreferenceInput {
  guestId: string;
  language?: string | null;
  roomTypeId?: string | null;
  floor?: string | null;
  view?: string | null;
  bedType?: string | null;
  diet?: string | null;
  allergies?: string[];
  favoritePaymentMethod?: string | null;
  birthDate?: Date | string | null;
  communicationPrefs?: Record<string, unknown>;
  custom?: Record<string, unknown>;
}

/** Saisie de segment. */
export interface CreateSegmentInput {
  name: string;
  description?: string | null;
  criteria?: Record<string, unknown>;
}

/** Saisie de campagne. */
export interface CreateCampaignInput {
  name: string;
  channel: CampaignChannel;
  segmentId?: string | null;
  subject?: string | null;
  messageTemplate: string;
  scheduledAt?: Date | string | null;
}

/** Saisie d'interaction. */
export interface CreateInteractionInput {
  guestId: string;
  type: string;
  summary: string;
  detail?: Record<string, unknown>;
  sourceModule?: string | null;
}

/** Saisie de tâche. */
export interface CreateTaskInput {
  guestId: string;
  kind: string;
  title: string;
  body?: string | null;
  dueAt?: Date | string | null;
  assignedTo?: string | null;
}

/** Saisie d'opportunité. */
export interface CreateOpportunityInput {
  guestId?: string | null;
  companyId?: string | null;
  title: string;
  value?: number | null;
  stage?: string;
  expectedDate?: Date | string | null;
  notes?: string | null;
}
