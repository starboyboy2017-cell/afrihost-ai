import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { CrmService, type CrmActor } from "./crm.service.js";
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

class MemoryRepo implements CrmRepository {
  companies: Company[] = [];
  preferences = new Map<string, GuestPreference>();
  segments: CustomerSegment[] = [];
  campaigns: Campaign[] = [];
  interactions: CustomerInteraction[] = [];
  tasks: CustomerTask[] = [];
  opportunities: Opportunity[] = [];
  sends: { campaignId: string; guestId: string; event: string }[] = [];
  seq = 0;

  async createCompany(hotelId: string, input: CreateCompanyInput): Promise<Company> {
    const c: Company = { id: `co-${++this.seq}`, hotelId, name: input.name, type: input.type, contact: input.contact ?? null, email: input.email ?? null, phone: input.phone ?? null, address: input.address ?? null, isActive: true };
    this.companies.push(c);
    return c;
  }
  async listCompanies(hotelId: string): Promise<Company[]> { return this.companies.filter((c) => c.hotelId === hotelId); }
  async companyExists(hotelId: string, id: string): Promise<boolean> { return this.companies.some((c) => c.id === id && c.hotelId === hotelId); }
  async savePreference(hotelId: string, input: SavePreferenceInput): Promise<GuestPreference> {
    const p: GuestPreference = { id: `pref-${++this.seq}`, hotelId, guestId: input.guestId, language: input.language ?? null, roomTypeId: input.roomTypeId ?? null, allergies: input.allergies ?? [], favoritePaymentMethod: input.favoritePaymentMethod ?? null, birthDate: input.birthDate ? new Date(input.birthDate) : null, communicationPrefs: input.communicationPrefs ?? null, custom: input.custom ?? null };
    this.preferences.set(input.guestId, p);
    return p;
  }
  async getPreference(hotelId: string, guestId: string): Promise<GuestPreference | null> { return this.preferences.get(guestId) ?? null; }
  async createSegment(hotelId: string, input: CreateSegmentInput): Promise<CustomerSegment> {
    const s: CustomerSegment = { id: `seg-${++this.seq}`, hotelId, name: input.name, description: input.description ?? null, criteria: input.criteria ?? null, isDynamic: true, isActive: true };
    this.segments.push(s);
    return s;
  }
  async listSegments(hotelId: string): Promise<CustomerSegment[]> { return this.segments.filter((s) => s.hotelId === hotelId); }
  async createCampaign(hotelId: string, input: CreateCampaignInput & { createdBy?: string }): Promise<Campaign> {
    const c: Campaign = { id: `camp-${++this.seq}`, hotelId, name: input.name, channel: input.channel, segmentId: input.segmentId ?? null, subject: input.subject ?? null, messageTemplate: input.messageTemplate, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, status: "DRAFT" };
    this.campaigns.push(c);
    return c;
  }
  async listCampaigns(hotelId: string): Promise<Campaign[]> { return this.campaigns.filter((c) => c.hotelId === hotelId); }
  async sendCampaign(hotelId: string, campaignId: string): Promise<void> { const c = this.campaigns.find((x) => x.id === campaignId)!; c.status = "SENT"; c.sentAt = new Date(); }
  async trackSend(hotelId: string, campaignId: string, guestId: string, event: "opened" | "clicked"): Promise<void> { this.sends.push({ campaignId, guestId, event }); }
  async recordInteraction(hotelId: string, input: CreateInteractionInput): Promise<CustomerInteraction> {
    const i: CustomerInteraction = { id: `int-${++this.seq}`, hotelId, guestId: input.guestId, type: input.type, summary: input.summary, detail: input.detail ?? null, sourceModule: input.sourceModule ?? null };
    this.interactions.push(i);
    return i;
  }
  async listInteractions(hotelId: string, guestId: string): Promise<CustomerInteraction[]> { return this.interactions.filter((i) => i.hotelId === hotelId && i.guestId === guestId); }
  async createTask(hotelId: string, input: CreateTaskInput): Promise<CustomerTask> {
    const t: CustomerTask = { id: `task-${++this.seq}`, hotelId, guestId: input.guestId, kind: input.kind, title: input.title, body: input.body ?? null, dueAt: input.dueAt ? new Date(input.dueAt) : null, done: false, assignedTo: input.assignedTo ?? null };
    this.tasks.push(t);
    return t;
  }
  async listTasks(hotelId: string, guestId: string): Promise<CustomerTask[]> { return this.tasks.filter((t) => t.hotelId === hotelId && t.guestId === guestId); }
  async completeTask(hotelId: string, taskId: string): Promise<void> { const t = this.tasks.find((x) => x.id === taskId)!; t.done = true; }
  async createOpportunity(hotelId: string, input: CreateOpportunityInput): Promise<Opportunity> {
    const o: Opportunity = { id: `opp-${++this.seq}`, hotelId, guestId: input.guestId ?? null, companyId: input.companyId ?? null, title: input.title, value: input.value ?? null, stage: input.stage ?? "PROSPECT", expectedDate: input.expectedDate ? new Date(input.expectedDate) : null, notes: input.notes ?? null };
    this.opportunities.push(o);
    return o;
  }
  async listOpportunities(hotelId: string, companyId?: string): Promise<Opportunity[]> { return this.opportunities.filter((o) => o.hotelId === hotelId && (!companyId || o.companyId === companyId)); }
  async getGuest360(hotelId: string, guestId: string): Promise<Guest360 | null> {
    return guestId === "g1" ? { guestId, firstName: "Awa", lastName: "Kouassi", email: "awa@demo.local", isVip: false, loyaltyPoints: 100, loyaltyTier: "BRONZE", totalSpent: 150000, stayCount: 3, avgStayDays: 2 } : null;
  }
  async guestExists(hotelId: string, guestId: string): Promise<boolean> { return guestId === "g1"; }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new CrmService(repo, audit, bus);
  const actor: CrmActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 21 — CRM", () => {
  it("fournit une vue 360 du client", async () => {
    const { service, actor } = setup();
    const g = await service.guest360("h1", "g1", actor);
    expect(g.firstName).toBe("Awa");
    expect(g.totalSpent).toBe(150000);
    expect(g.stayCount).toBe(3);
  });

  it("crée une entreprise / agence partenaire", async () => {
    const { service, actor } = setup();
    const c = await service.createCompany("h1", { name: "Agence Voyage Dakar", type: "AGENCY" }, actor);
    expect(c.type).toBe("AGENCY");
  });

  it("sauvegarde les préférences client (extensibles)", async () => {
    const { service, actor } = setup();
    const p = await service.savePreference("h1", { guestId: "g1", language: "fr", bedType: "king", allergies: ["arachides"], favoritePaymentMethod: "MOBILE_MONEY", custom: { extra: "balcon" } }, actor);
    expect(p.language).toBe("fr");
    expect(p.allergies).toContain("arachides");
    expect(p.custom).toEqual({ extra: "balcon" });
  });

  it("crée un segment dynamique avec critères configurables", async () => {
    const { service, actor } = setup();
    const s = await service.createSegment("h1", { name: "Forte dépense", criteria: { minSpend: 100000, isVip: true } }, actor);
    expect(s.criteria).toEqual({ minSpend: 100000, isVip: true });
  });

  it("crée une campagne multicanal", async () => {
    const { service, actor } = setup();
    const c = await service.createCampaign("h1", { name: "Promo été", channel: "WHATSAPP", messageTemplate: "Bonjour {{firstName}} !", scheduledAt: "2026-07-01" }, actor);
    expect(c.channel).toBe("WHATSAPP");
    expect(c.status).toBe("DRAFT");
  });

  it("envoie une campagne et suit les ouvertures/clics", async () => {
    const { repo, service, actor } = setup();
    const c = await service.createCampaign("h1", { name: "Promo", channel: "EMAIL", messageTemplate: "Offre" }, actor);
    await service.sendCampaign("h1", c.id, actor);
    await service.track("h1", c.id, "g1", "opened", actor);
    await service.track("h1", c.id, "g1", "clicked", actor);
    expect(repo.campaigns.find((x) => x.id === c.id)!.status).toBe("SENT");
    expect(repo.sends.some((s) => s.event === "clicked")).toBe(true);
  });

  it("enregistre une interaction (historique 360)", async () => {
    const { repo, service, actor } = setup();
    await service.recordInteraction("h1", { guestId: "g1", type: "complaint", summary: "Problème de clim", sourceModule: "maintenance" }, actor);
    const interactions = await service.listInteractions("h1", "g1", actor);
    expect(interactions.some((i) => i.type === "complaint")).toBe(true);
    void repo;
  });

  it("crée des notes / tâches / rappels", async () => {
    const { service, actor } = setup();
    await service.createTask("h1", { guestId: "g1", kind: "NOTE", title: "Préfère chambre calme" }, actor);
    await service.createTask("h1", { guestId: "g1", kind: "REMINDER", title: "Appeler client", dueAt: "2026-08-10" }, actor);
    const tasks = await service.listTasks("h1", "g1", actor);
    expect(tasks.length).toBe(2);
  });

  it("complète une tâche", async () => {
    const { repo, service, actor } = setup();
    const t = await service.createTask("h1", { guestId: "g1", kind: "TASK", title: "Envoyer devis" }, actor);
    await service.completeTask("h1", t.id, actor);
    expect(repo.tasks.find((x) => x.id === t.id)!.done).toBe(true);
  });

  it("crée une opportunité", async () => {
    const { service, actor } = setup();
    const o = await service.createOpportunity("h1", { title: "Séminaire 20 pers.", value: 500000, stage: "QUOTED" }, actor);
    expect(o.stage).toBe("QUOTED");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: CrmActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.guest360("h1", "g1", other)).rejects.toThrow(CrmError);
  });

  it("journalise les actions CRM", async () => {
    const { writer, service, actor } = setup();
    await service.createCompany("h1", { name: "Agence X", type: "AGENCY" }, actor);
    await service.createCampaign("h1", { name: "C1", channel: "SMS", messageTemplate: "M" }, actor);
    expect(writer.entries.some((e) => e.action === "crm.company.create")).toBe(true);
    expect(writer.entries.some((e) => e.action === "crm.campaign.create")).toBe(true);
  });
});
