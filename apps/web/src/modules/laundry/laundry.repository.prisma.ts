/**
 * Module 11 — Blanchisserie : adapter Prisma.
 */
import type {
  LaundryRepository,
  LaundryStock,
  CreateBatchInput,
  CreateItemInput,
  CreateItemTypeInput,
  CreateLossInput,
  LaundryBatch,
  LaundryFilter,
  LaundryItem,
  LaundryItemType,
  LaundryLoss,
  LaundryState,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaLaundryRepository implements LaundryRepository {
  async createItemType(hotelId: string, input: CreateItemTypeInput): Promise<LaundryItemType> {
    const t = await prisma.laundryItemType.create({ data: { hotelId, name: input.name, unit: input.unit ?? null } });
    return { id: t.id, hotelId: t.hotelId, name: t.name, unit: t.unit, createdAt: t.createdAt, updatedAt: t.updatedAt };
  }
  async listItemTypes(hotelId: string): Promise<LaundryItemType[]> {
    const rows = await prisma.laundryItemType.findMany({ where: { hotelId, deletedAt: null }, orderBy: { name: "asc" } });
    return rows.map((t) => ({ id: t.id, hotelId: t.hotelId, name: t.name, unit: t.unit }));
  }
  async itemTypeExists(hotelId: string, itemTypeId: string): Promise<boolean> {
    const t = await prisma.laundryItemType.findFirst({ where: { id: itemTypeId, hotelId } });
    return t !== null;
  }
  async createItem(hotelId: string, input: CreateItemInput): Promise<LaundryItem> {
    const i = await prisma.laundryItem.create({ data: { hotelId, itemTypeId: input.itemTypeId, code: input.code ?? null, state: "CLEAN" } });
    return mapItem(i);
  }
  async getItem(hotelId: string, itemId: string): Promise<LaundryItem | null> {
    const i = await prisma.laundryItem.findFirst({ where: { id: itemId, hotelId } });
    return i ? mapItem(i) : null;
  }
  async setItemState(hotelId: string, itemId: string, state: LaundryState, roomId?: string | null): Promise<LaundryItem> {
    const i = await prisma.laundryItem.update({
      where: { id: itemId, hotelId },
      data: { state, roomId: roomId === null ? null : roomId },
    });
    return mapItem(i);
  }
  async setItemsState(itemIds: string[], state: LaundryState, roomId?: string | null): Promise<number> {
    const r = await prisma.laundryItem.updateMany({
      where: { id: { in: itemIds } },
      data: { state, roomId: roomId === null ? null : roomId },
    });
    return r.count;
  }
  async listItems(filter: LaundryFilter): Promise<{ items: LaundryItem[]; total: number }> {
    const where: Record<string, unknown> = { hotelId: filter.hotelId, deletedAt: null, state: filter.state, itemTypeId: filter.itemTypeId };
    const [rows, total] = await prisma.$transaction([
      prisma.laundryItem.findMany({ where, orderBy: { createdAt: "asc" }, skip: filter.offset ?? 0, take: filter.limit ?? 100 }),
      prisma.laundryItem.count({ where }),
    ]);
    return { items: rows.map(mapItem), total };
  }
  async getStock(hotelId: string): Promise<LaundryStock[]> {
    const rows = await prisma.laundryItem.groupBy({
      by: ["itemTypeId"],
      where: { hotelId, deletedAt: null },
      _count: { _all: true },
    });
    const clean = await prisma.laundryItem.groupBy({
      by: ["itemTypeId"],
      where: { hotelId, deletedAt: null, state: "CLEAN" },
      _count: { _all: true },
    });
    const cleanMap = new Map(clean.map((c) => [c.itemTypeId, c._count._all]));
    const types = await prisma.laundryItemType.findMany({ where: { hotelId } });
    const nameMap = new Map(types.map((t) => [t.id, t.name]));
    return rows.map((r) => ({
      itemTypeId: r.itemTypeId,
      name: nameMap.get(r.itemTypeId) ?? r.itemTypeId,
      clean: cleanMap.get(r.itemTypeId) ?? 0,
      total: r._count._all,
    }));
  }
  async softDeleteItem(hotelId: string, itemId: string): Promise<void> {
    await prisma.laundryItem.update({ where: { id: itemId, hotelId }, data: { deletedAt: new Date() } });
  }
  async createBatch(hotelId: string, input: CreateBatchInput): Promise<LaundryBatch> {
    const seq = (await prisma.laundryBatch.count()) + 1;
    const b = await prisma.laundryBatch.create({
      data: {
        hotelId,
        code: `LB-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`,
        mode: input.mode,
        providerName: input.providerName ?? null,
        responsible: input.responsible ?? null,
        cost: input.cost ?? null,
        currency: input.currency ?? null,
        notes: input.notes ?? null,
        ...(input.itemIds && input.itemIds.length > 0
          ? { entries: { create: input.itemIds.map((itemId) => ({ itemId })) } }
          : {}),
      },
    });
    return mapBatch(b);
  }
  async completeBatch(hotelId: string, batchId: string): Promise<LaundryBatch> {
    const b = await prisma.laundryBatch.update({ where: { id: batchId, hotelId }, data: { completedAt: new Date() } });
    return mapBatch(b);
  }
  async getBatch(hotelId: string, batchId: string): Promise<LaundryBatch | null> {
    const b = await prisma.laundryBatch.findFirst({ where: { id: batchId, hotelId } });
    return b ? mapBatch(b) : null;
  }
  async listBatches(hotelId: string): Promise<LaundryBatch[]> {
    const rows = await prisma.laundryBatch.findMany({ where: { hotelId }, orderBy: { startedAt: "desc" } });
    return rows.map(mapBatch);
  }
  async createLoss(hotelId: string, input: CreateLossInput): Promise<LaundryLoss> {
    const l = await prisma.laundryLoss.create({
      data: { hotelId, itemId: input.itemId, reason: input.reason, note: input.note ?? null, costValue: input.costValue ?? null },
    });
    return mapLoss(l);
  }
  async listLosses(hotelId: string): Promise<LaundryLoss[]> {
    const rows = await prisma.laundryLoss.findMany({ where: { hotelId }, orderBy: { createdAt: "desc" } });
    return rows.map(mapLoss);
  }
}

type ItemRow = {
  id: string; hotelId: string; itemTypeId: string; code: string | null; state: string;
  roomId: string | null; createdAt: Date; updatedAt: Date;
};
function mapItem(i: ItemRow): LaundryItem {
  return { id: i.id, hotelId: i.hotelId, itemTypeId: i.itemTypeId, code: i.code, state: i.state as LaundryItem["state"], roomId: i.roomId };
}
type BatchRow = {
  id: string; hotelId: string; code: string; mode: string; providerName: string | null;
  startedAt: Date; completedAt: Date | null; responsible: string | null; cost: number | null;
  currency: string | null; notes: string | null; createdAt: Date; updatedAt: Date;
};
function mapBatch(b: BatchRow): LaundryBatch {
  return {
    id: b.id, hotelId: b.hotelId, code: b.code, mode: b.mode as LaundryBatch["mode"], providerName: b.providerName,
    startedAt: b.startedAt, completedAt: b.completedAt, responsible: b.responsible, cost: b.cost, currency: b.currency,
    notes: b.notes, createdAt: b.createdAt, updatedAt: b.updatedAt,
  };
}
type LossRow = { id: string; hotelId: string; itemId: string; reason: string; note: string | null; costValue: number | null; createdAt: Date };
function mapLoss(l: LossRow): LaundryLoss {
  return { id: l.id, hotelId: l.hotelId, itemId: l.itemId, reason: l.reason as LaundryLoss["reason"], note: l.note, costValue: l.costValue, createdAt: l.createdAt };
}
