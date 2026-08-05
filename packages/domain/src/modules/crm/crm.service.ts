/**
 * Module 21 — CRM : service métier.
 *
 * Fonctionnalités :
 *   - **vue 360** de chaque client (historique séjours, dépenses, préférences, interactions) ;
 *   - **segmentation dynamique** (critères configurables) ;
 *   - **moteur de campagnes multicanal** (email, SMS, WhatsApp, push) avec planification,
 *     ciblage, suivi ouvertures/clics ;
 *   - **préférences clients** (langue, chambre, étage, vue, lit, régime, allergies, paiement,
 *     anniversaire, communication) ;
 *   - **notes / tâches / rappels / opportunités / entreprises & agences** ;
 *   - architecture extensible pour un futur **programme de fidélité** (points, niveaux,
 *     récompenses) — sans logique en dur.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC crm.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { CrmError } from "./crm.error.js";
import type { CrmRepository, Guest360 } from "./crm.repository.js";
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
import {
  validateCreateCampaign,
  validateCreateCompany,
  validateCreateInteraction,
  validateCreateOpportunity,
  validateCreateSegment,
  validateCreateCustomerTask,
  validateSavePreference,
} from "./crm.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface CrmActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class CrmService {
  constructor(
    private readonly repo: CrmRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---- Vue 360 ----

  /** Récupère la vue 360 d'un client. */
  async guest360(hotelId: string, guestId: string, actor: CrmActor): Promise<Guest360> {
    this.assertHotel(hotelId, actor);
    const g = await this.repo.getGuest360(hotelId, guestId);
    if (!g) throw new CrmError("Client introuvable");
    return g;
  }

  // ---- Entreprises / agences ----

  async createCompany(hotelId: string, input: CreateCompanyInput, actor: CrmActor): Promise<Company> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateCompany(input);
    const company = await this.repo.createCompany(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.company.create", entityType: "Company", entityId: company.id, after: { name: company.name, type: company.type } });
    return company;
  }

  async listCompanies(hotelId: string, actor: CrmActor): Promise<Company[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listCompanies(hotelId);
  }

  // ---- Préférences ----

  /** Sauvegarde les préférences d'un client (extensible). */
  async savePreference(hotelId: string, input: SavePreferenceInput, actor: CrmActor): Promise<GuestPreference> {
    this.assertHotel(hotelId, actor);
    const v = validateSavePreference(input);
    if (!(await this.repo.guestExists(hotelId, v.guestId))) throw new CrmError("Client introuvable");
    const pref = await this.repo.savePreference(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.preference.save", entityType: "GuestPreference", entityId: pref.id, after: { guestId: v.guestId } });
    return pref;
  }

  // ---- Segments ----

  /** Crée un segment dynamique (critères configurables). */
  async createSegment(hotelId: string, input: CreateSegmentInput, actor: CrmActor): Promise<CustomerSegment> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateSegment(input);
    const segment = await this.repo.createSegment(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.segment.create", entityType: "CustomerSegment", entityId: segment.id, after: { name: v.name } });
    return segment;
  }

  async listSegments(hotelId: string, actor: CrmActor): Promise<CustomerSegment[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listSegments(hotelId);
  }

  // ---- Campagnes ----

  /** Crée et planifie une campagne multicanal. */
  async createCampaign(hotelId: string, input: CreateCampaignInput, actor: CrmActor): Promise<Campaign> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateCampaign(input);
    const campaign = await this.repo.createCampaign(hotelId, { ...v, createdBy: actor.actorUserId });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.campaign.create", entityType: "Campaign", entityId: campaign.id, after: { name: v.name, channel: v.channel } });
    return campaign;
  }

  async listCampaigns(hotelId: string, actor: CrmActor): Promise<Campaign[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listCampaigns(hotelId);
  }

  /** Envoie une campagne aux clients ciblés. */
  async sendCampaign(hotelId: string, campaignId: string, actor: CrmActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.sendCampaign(hotelId, campaignId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.campaign.send", entityType: "Campaign", entityId: campaignId, after: { status: "SENT" } });
  }

  /** Suit une ouverture / un clic. */
  async track(hotelId: string, campaignId: string, guestId: string, event: "opened" | "clicked", actor: CrmActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.trackSend(hotelId, campaignId, guestId, event);
  }

  // ---- Interactions ----

  /** Enregistre une interaction (auto depuis les modules). */
  async recordInteraction(hotelId: string, input: CreateInteractionInput, actor: CrmActor): Promise<CustomerInteraction> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateInteraction(input);
    if (!(await this.repo.guestExists(hotelId, v.guestId))) throw new CrmError("Client introuvable");
    const interaction = await this.repo.recordInteraction(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.interaction", entityType: "CustomerInteraction", entityId: interaction.id, after: { type: v.type, guestId: v.guestId } });
    return interaction;
  }

  async listInteractions(hotelId: string, guestId: string, actor: CrmActor): Promise<CustomerInteraction[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listInteractions(hotelId, guestId);
  }

  // ---- Tâches / notes / rappels ----

  async createTask(hotelId: string, input: CreateTaskInput, actor: CrmActor): Promise<CustomerTask> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateCustomerTask(input);
    const task = await this.repo.createTask(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: `crm.task.${v.kind.toLowerCase()}`, entityType: "CustomerTask", entityId: task.id, after: { title: v.title } });
    return task;
  }

  async listTasks(hotelId: string, guestId: string, actor: CrmActor): Promise<CustomerTask[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listTasks(hotelId, guestId);
  }

  async completeTask(hotelId: string, taskId: string, actor: CrmActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.completeTask(hotelId, taskId);
  }

  // ---- Opportunités ----

  async createOpportunity(hotelId: string, input: CreateOpportunityInput, actor: CrmActor): Promise<Opportunity> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateOpportunity(input);
    const opp = await this.repo.createOpportunity(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "crm.opportunity.create", entityType: "Opportunity", entityId: opp.id, after: { title: v.title, stage: v.stage } });
    return opp;
  }

  async listOpportunities(hotelId: string, companyId: string | undefined, actor: CrmActor): Promise<Opportunity[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listOpportunities(hotelId, companyId);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: CrmActor): void {
    if (actor.hotelId !== hotelId) throw new CrmError("Accès inter-hôtel refusé");
  }
}
