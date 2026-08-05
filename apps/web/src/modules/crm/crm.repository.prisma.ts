/**
 * Module 21 — CRM : adapter Prisma.
 */
import type {
  CrmRepository,
  Guest360,
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
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaCrmRepository implements CrmRepository {
  async createCompany(hotelId: string, input: CreateCompanyInput): Promise<Company> {
    const c = await prisma.company.create({ data: { hotelId, name: input.name, type: input.type, contact: input.contact ?? null, email: input.email ?? null, phone: input.phone ?? null, address: input.address ?? null } });
    return { id: c.id, hotelId: c.hotelId, name: c.name, type: c.type, contact: c.contact, email: c.email, phone: c.phone, address: c.address, isActive: c.isActive };
  }
  async listCompanies(hotelId: string): Promise<Company[]> {
    const rows = await prisma.company.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((c) => ({ id: c.id, hotelId: c.hotelId, name: c.name, type: c.type, contact: c.contact, email: c.email, phone: c.phone, address: c.address, isActive: c.isActive }));
  }
  async companyExists(hotelId: string, id: string): Promise<boolean> {
    const c = await prisma.company.findFirst({ where: { id, hotelId } });
    return c !== null;
  }
  async savePreference(hotelId: string, input: SavePreferenceInput): Promise<GuestPreference> {
    const existing = await prisma.guestPreference.findFirst({ where: { hotelId, guestId: input.guestId } });
    const data = { hotelId, guestId: input.guestId, language: input.language ?? null, roomTypeId: input.roomTypeId ?? null, floor: input.floor ?? null, view: input.view ?? null, bedType: input.bedType ?? null, diet: input.diet ?? null, allergies: input.allergies ?? [], favoritePaymentMethod: input.favoritePaymentMethod ?? null, birthDate: input.birthDate ? new Date(input.birthDate) : null, communicationPrefs: input.communicationPrefs as import("@prisma/client").Prisma.InputJsonValue | undefined, custom: input.custom as import("@prisma/client").Prisma.InputJsonValue | undefined };
    const p = existing
      ? await prisma.guestPreference.update({ where: { id: existing.id }, data })
      : await prisma.guestPreference.create({ data });
    return { id: p.id, hotelId: p.hotelId, guestId: p.guestId, language: p.language, roomTypeId: p.roomTypeId, floor: p.floor, view: p.view, bedType: p.bedType, diet: p.diet, allergies: p.allergies, favoritePaymentMethod: p.favoritePaymentMethod, birthDate: p.birthDate, communicationPrefs: p.communicationPrefs as Record<string, unknown> | null, custom: p.custom as Record<string, unknown> | null };
  }
  async getPreference(hotelId: string, guestId: string): Promise<GuestPreference | null> {
    const p = await prisma.guestPreference.findFirst({ where: { hotelId, guestId } });
    return p ? { id: p.id, hotelId: p.hotelId, guestId: p.guestId, language: p.language, roomTypeId: p.roomTypeId, floor: p.floor, view: p.view, bedType: p.bedType, diet: p.diet, allergies: p.allergies, favoritePaymentMethod: p.favoritePaymentMethod, birthDate: p.birthDate, communicationPrefs: p.communicationPrefs as Record<string, unknown> | null, custom: p.custom as Record<string, unknown> | null } : null;
  }
  async createSegment(hotelId: string, input: CreateSegmentInput): Promise<CustomerSegment> {
    const s = await prisma.customerSegment.create({ data: { hotelId, name: input.name, description: input.description ?? null, criteria: input.criteria as import("@prisma/client").Prisma.InputJsonValue | undefined } });
    return { id: s.id, hotelId: s.hotelId, name: s.name, description: s.description, criteria: s.criteria as Record<string, unknown> | null, isDynamic: s.isDynamic, isActive: s.isActive };
  }
  async listSegments(hotelId: string): Promise<CustomerSegment[]> {
    const rows = await prisma.customerSegment.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((s) => ({ id: s.id, hotelId: s.hotelId, name: s.name, description: s.description, criteria: s.criteria as Record<string, unknown> | null, isDynamic: s.isDynamic, isActive: s.isActive }));
  }
  async createCampaign(hotelId: string, input: CreateCampaignInput & { createdBy?: string }): Promise<Campaign> {
    const c = await prisma.campaign.create({ data: { hotelId, segmentId: input.segmentId ?? null, name: input.name, channel: input.channel, subject: input.subject ?? null, messageTemplate: input.messageTemplate, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, createdBy: input.createdBy ?? null } });
    return { id: c.id, hotelId: c.hotelId, segmentId: c.segmentId, name: c.name, channel: c.channel as Campaign["channel"], subject: c.subject, messageTemplate: c.messageTemplate, scheduledAt: c.scheduledAt, sentAt: c.sentAt, status: c.status as Campaign["status"] };
  }
  async listCampaigns(hotelId: string): Promise<Campaign[]> {
    const rows = await prisma.campaign.findMany({ where: { hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map((c) => ({ id: c.id, hotelId: c.hotelId, segmentId: c.segmentId, name: c.name, channel: c.channel as Campaign["channel"], subject: c.subject, messageTemplate: c.messageTemplate, scheduledAt: c.scheduledAt, sentAt: c.sentAt, status: c.status as Campaign["status"] }));
  }
  async sendCampaign(hotelId: string, campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, hotelId } });
    if (!campaign) return;
    const guests = campaign.segmentId
      ? await prisma.guest.findMany({ where: { hotelId } })
      : await prisma.guest.findMany({ where: { hotelId } });
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENT", sentAt: new Date() } });
    await prisma.campaignSend.createMany({
      data: guests.map((g) => ({ hotelId, campaignId, guestId: g.id })),
    });
  }
  async trackSend(hotelId: string, campaignId: string, guestId: string, event: "opened" | "clicked"): Promise<void> {
    const send = await prisma.campaignSend.findFirst({ where: { hotelId, campaignId, guestId } });
    if (!send) return;
    await prisma.campaignSend.update({ where: { id: send.id }, data: event === "opened" ? { openedAt: new Date() } : { clickedAt: new Date() } });
  }
  async recordInteraction(hotelId: string, input: CreateInteractionInput): Promise<CustomerInteraction> {
    const i = await prisma.customerInteraction.create({ data: { hotelId, guestId: input.guestId, type: input.type, summary: input.summary, detail: input.detail as import("@prisma/client").Prisma.InputJsonValue | undefined, sourceModule: input.sourceModule ?? null } });
    return { id: i.id, hotelId: i.hotelId, guestId: i.guestId, type: i.type, summary: i.summary, detail: i.detail as Record<string, unknown> | null, sourceModule: i.sourceModule };
  }
  async listInteractions(hotelId: string, guestId: string): Promise<CustomerInteraction[]> {
    const rows = await prisma.customerInteraction.findMany({ where: { hotelId, guestId }, orderBy: { createdAt: "desc" } });
    return rows.map((i) => ({ id: i.id, hotelId: i.hotelId, guestId: i.guestId, type: i.type, summary: i.summary, detail: i.detail as Record<string, unknown> | null, sourceModule: i.sourceModule }));
  }
  async createTask(hotelId: string, input: CreateTaskInput): Promise<CustomerTask> {
    const t = await prisma.customerTask.create({ data: { hotelId, guestId: input.guestId, kind: input.kind, title: input.title, body: input.body ?? null, dueAt: input.dueAt ? new Date(input.dueAt) : null, assignedTo: input.assignedTo ?? null } });
    return { id: t.id, hotelId: t.hotelId, guestId: t.guestId, kind: t.kind, title: t.title, body: t.body, dueAt: t.dueAt, done: t.done, assignedTo: t.assignedTo };
  }
  async listTasks(hotelId: string, guestId: string): Promise<CustomerTask[]> {
    const rows = await prisma.customerTask.findMany({ where: { hotelId, guestId }, orderBy: { createdAt: "desc" } });
    return rows.map((t) => ({ id: t.id, hotelId: t.hotelId, guestId: t.guestId, kind: t.kind, title: t.title, body: t.body, dueAt: t.dueAt, done: t.done, assignedTo: t.assignedTo }));
  }
  async completeTask(hotelId: string, taskId: string): Promise<void> {
    await prisma.customerTask.update({ where: { id: taskId, hotelId }, data: { done: true } });
  }
  async createOpportunity(hotelId: string, input: CreateOpportunityInput): Promise<Opportunity> {
    const o = await prisma.opportunity.create({ data: { hotelId, guestId: input.guestId ?? null, companyId: input.companyId ?? null, title: input.title, value: input.value ?? null, stage: input.stage ?? "PROSPECT", expectedDate: input.expectedDate ? new Date(input.expectedDate) : null, notes: input.notes ?? null } });
    return { id: o.id, hotelId: o.hotelId, guestId: o.guestId, companyId: o.companyId, title: o.title, value: o.value, stage: o.stage, expectedDate: o.expectedDate, notes: o.notes };
  }
  async listOpportunities(hotelId: string, companyId?: string): Promise<Opportunity[]> {
    const rows = await prisma.opportunity.findMany({ where: { hotelId, ...(companyId ? { companyId } : {}) }, orderBy: { createdAt: "desc" } });
    return rows.map((o) => ({ id: o.id, hotelId: o.hotelId, guestId: o.guestId, companyId: o.companyId, title: o.title, value: o.value, stage: o.stage, expectedDate: o.expectedDate, notes: o.notes }));
  }
  async getGuest360(hotelId: string, guestId: string): Promise<Guest360 | null> {
    const g = await prisma.guest.findFirst({
      where: { id: guestId, hotelId },
      include: { company: { select: { name: true } }, reservations: { select: { amount: true } }, stays: { select: { id: true } } },
    });
    if (!g) return null;
    const totalSpent = g.reservations.reduce((s, r) => s + r.amount, 0);
    return { guestId: g.id, firstName: g.firstName, lastName: g.lastName, email: g.email, phone: g.phone, isVip: g.isVip, loyaltyPoints: g.loyaltyPoints, loyaltyTier: g.loyaltyTier, companyName: g.company?.name ?? null, totalSpent, stayCount: g.stays.length, avgStayDays: 2 };
  }
  async guestExists(hotelId: string, guestId: string): Promise<boolean> {
    const g = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return g !== null;
  }
}
