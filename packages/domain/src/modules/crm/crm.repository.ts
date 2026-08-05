/**
 * Module 21 — CRM : port de persistance.
 */
import type {
  Campaign,
  Company,
  CreateCampaignInput,
  CreateCompanyInput,
  CreateInteractionInput,
  CreateOpportunityInput,
  CreateSegmentInput,
  CreateTaskInput,
  CustomerInteraction,
  CustomerSegment,
  CustomerTask,
  GuestPreference,
  Opportunity,
  SavePreferenceInput,
} from "./crm.types.js";

/** Vue 360 d'un client. */
export interface Guest360 {
  guestId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  isVip: boolean;
  loyaltyPoints: number;
  loyaltyTier: string | null;
  companyName?: string | null;
  totalSpent: number;
  stayCount: number;
  avgStayDays: number;
}

export interface CrmRepository {
  // Entreprises / agences
  createCompany(hotelId: string, input: CreateCompanyInput): Promise<Company>;
  listCompanies(hotelId: string): Promise<Company[]>;
  companyExists(hotelId: string, companyId: string): Promise<boolean>;

  // Préférences
  savePreference(hotelId: string, input: SavePreferenceInput): Promise<GuestPreference>;
  getPreference(hotelId: string, guestId: string): Promise<GuestPreference | null>;

  // Segments
  createSegment(hotelId: string, input: CreateSegmentInput): Promise<CustomerSegment>;
  listSegments(hotelId: string): Promise<CustomerSegment[]>;

  // Campagnes
  createCampaign(hotelId: string, input: CreateCampaignInput & { createdBy?: string }): Promise<Campaign>;
  listCampaigns(hotelId: string): Promise<Campaign[]>;
  sendCampaign(hotelId: string, campaignId: string): Promise<void>;
  trackSend(hotelId: string, campaignId: string, guestId: string, event: "opened" | "clicked"): Promise<void>;

  // Interactions
  recordInteraction(hotelId: string, input: CreateInteractionInput): Promise<CustomerInteraction>;
  listInteractions(hotelId: string, guestId: string): Promise<CustomerInteraction[]>;

  // Tâches
  createTask(hotelId: string, input: CreateTaskInput): Promise<CustomerTask>;
  listTasks(hotelId: string, guestId: string): Promise<CustomerTask[]>;
  completeTask(hotelId: string, taskId: string): Promise<void>;

  // Opportunités
  createOpportunity(hotelId: string, input: CreateOpportunityInput): Promise<Opportunity>;
  listOpportunities(hotelId: string, companyId?: string): Promise<Opportunity[]>;

  // Vue 360
  getGuest360(hotelId: string, guestId: string): Promise<Guest360 | null>;
  guestExists(hotelId: string, guestId: string): Promise<boolean>;
}
