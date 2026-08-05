/**
 * Module 16 — Pourboires : adapter Prisma.
 */
import type {
  TipsRepository,
  CreateTipInput,
  CreateTipRuleInput,
  Tip,
  TipAllocation,
  TipFilter,
  TipRule,
  TipStatus,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaTipsRepository implements TipsRepository {
  async createRule(hotelId: string, input: CreateTipRuleInput): Promise<TipRule> {
    const r = await prisma.tipRule.create({
      data: { hotelId, name: input.name, serverPercent: input.serverPercent ?? 60, teamPercent: input.teamPercent ?? 30, kitchenPercent: input.kitchenPercent ?? 10, otherPercent: input.otherPercent ?? 0 },
    });
    return mapRule(r);
  }
  async listRules(hotelId: string, activeOnly = false): Promise<TipRule[]> {
    const rows = await prisma.tipRule.findMany({ where: { hotelId, ...(activeOnly ? { isActive: true } : {}) }, orderBy: { name: "asc" } });
    return rows.map(mapRule);
  }
  async getRule(hotelId: string, id: string): Promise<TipRule | null> {
    const r = await prisma.tipRule.findFirst({ where: { id, hotelId } });
    return r ? mapRule(r) : null;
  }
  async createTip(hotelId: string, input: CreateTipInput): Promise<Tip> {
    const t = await prisma.tip.create({
      data: { hotelId, posPaymentId: input.posPaymentId ?? null, posOrderId: input.posOrderId ?? null, type: input.type, amount: input.amount, method: input.method, tipRuleId: input.tipRuleId ?? null, note: input.note ?? null },
    });
    return mapTip(t);
  }
  async getTip(hotelId: string, id: string): Promise<Tip | null> {
    const t = await prisma.tip.findFirst({ where: { id, hotelId } });
    return t ? mapTip(t) : null;
  }
  async setTipStatus(hotelId: string, id: string, status: TipStatus, meta?: { by?: string; at?: Date }): Promise<Tip> {
    const t = await prisma.tip.update({
      where: { id, hotelId },
      data: {
        status,
        validatedBy: status === "VALIDATED" ? meta?.by ?? null : undefined,
        validatedAt: status === "VALIDATED" ? meta?.at ?? new Date() : undefined,
        distributedAt: status === "DISTRIBUTED" ? meta?.at ?? new Date() : undefined,
        cancelledBy: status === "CANCELLED" ? meta?.by ?? null : undefined,
        cancelledAt: status === "CANCELLED" ? meta?.at ?? new Date() : undefined,
      },
    });
    return mapTip(t);
  }
  async listTips(filter: TipFilter): Promise<{ tips: Tip[]; total: number }> {
    const where: Record<string, unknown> = {
      hotelId: filter.hotelId, status: filter.status, type: filter.type,
      createdAt: { gte: filter.from, lte: filter.to },
    };
    const [rows, total] = await prisma.$transaction([
      prisma.tip.findMany({ where, orderBy: { createdAt: "desc" }, skip: filter.offset ?? 0, take: filter.limit ?? 100 }),
      prisma.tip.count({ where }),
    ]);
    return { tips: rows.map(mapTip), total };
  }
  async addAllocation(tipId: string, recipient: string, amount: number): Promise<TipAllocation> {
    const a = await prisma.tipAllocation.create({ data: { tipId, recipient, amount } });
    return { id: a.id, tipId: a.tipId, recipient: a.recipient, amount: a.amount };
  }
  async listAllocations(tipId: string): Promise<TipAllocation[]> {
    const rows = await prisma.tipAllocation.findMany({ where: { tipId } });
    return rows.map((a) => ({ id: a.id, tipId: a.tipId, recipient: a.recipient, amount: a.amount }));
  }
  async logTipEvent(tipId: string, action: string, actor?: string, detail?: string): Promise<void> {
    await prisma.tipEvent.create({ data: { tipId, action, actor: actor ?? null, detail: detail ?? null } });
  }
  async posPaymentExists(hotelId: string, id: string): Promise<boolean> {
    const p = await prisma.posPayment.findFirst({ where: { id, hotelId } });
    return p !== null;
  }
}

type RuleRow = { id: string; hotelId: string; name: string; isActive: boolean; serverPercent: number; teamPercent: number; kitchenPercent: number; otherPercent: number; createdAt: Date; updatedAt: Date };
function mapRule(r: RuleRow): TipRule {
  return { id: r.id, hotelId: r.hotelId, name: r.name, isActive: r.isActive, serverPercent: r.serverPercent, teamPercent: r.teamPercent, kitchenPercent: r.kitchenPercent, otherPercent: r.otherPercent, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
type TipRow = { id: string; hotelId: string; posPaymentId: string | null; posOrderId: string | null; type: string; status: string; amount: number; method: string; tipRuleId: string | null; validatedBy: string | null; validatedAt: Date | null; distributedAt: Date | null; cancelledBy: string | null; cancelledAt: Date | null; note: string | null; createdAt: Date; updatedAt: Date };
function mapTip(t: TipRow): Tip {
  return { id: t.id, hotelId: t.hotelId, posPaymentId: t.posPaymentId, posOrderId: t.posOrderId, type: t.type as Tip["type"], status: t.status as Tip["status"], amount: t.amount, method: t.method as Tip["method"], tipRuleId: t.tipRuleId, validatedBy: t.validatedBy, validatedAt: t.validatedAt, distributedAt: t.distributedAt, cancelledBy: t.cancelledBy, cancelledAt: t.cancelledAt, note: t.note, createdAt: t.createdAt, updatedAt: t.updatedAt };
}
