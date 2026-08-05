/**
 * Module 14 — Cuisine : adapter Prisma.
 */
import type {
  KitchenRepository,
  CreateKitchenOrderInput,
  CreateStationInput,
  KitchenFilter,
  KitchenOrder,
  KitchenOrderLine,
  KitchenOrderStatus,
  KitchenStation,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaKitchenRepository implements KitchenRepository {
  async createStation(hotelId: string, input: CreateStationInput): Promise<KitchenStation> {
    const s = await prisma.kitchenStation.create({ data: { hotelId, name: input.name } });
    return { id: s.id, hotelId: s.hotelId, name: s.name };
  }
  async listStations(hotelId: string): Promise<KitchenStation[]> {
    const rows = await prisma.kitchenStation.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((s) => ({ id: s.id, hotelId: s.hotelId, name: s.name }));
  }
  async stationExists(hotelId: string, id: string): Promise<boolean> {
    const s = await prisma.kitchenStation.findFirst({ where: { id, hotelId } });
    return s !== null;
  }
  async createOrder(hotelId: string, input: CreateKitchenOrderInput & { kitchenRef: string }): Promise<KitchenOrder> {
    const o = await prisma.kitchenOrder.create({
      data: {
        hotelId, posOrderId: input.posOrderId, stationId: input.stationId, kitchenRef: input.kitchenRef,
        priority: input.priority ?? "MEDIUM", notes: input.notes ?? null, posPointId: input.posPointId ?? null,
        reservationId: input.reservationId ?? null, roomId: input.roomId ?? null,
      },
    });
    return mapOrder(o);
  }
  async getOrder(hotelId: string, id: string): Promise<KitchenOrder | null> {
    const o = await prisma.kitchenOrder.findFirst({ where: { id, hotelId } });
    return o ? mapOrder(o) : null;
  }
  async getOrderLines(id: string): Promise<KitchenOrderLine[]> {
    const rows = await prisma.kitchenOrderLine.findMany({ where: { kitchenOrderId: id } });
    return rows.map((l) => ({ id: l.id, kitchenOrderId: l.kitchenOrderId, productId: l.productId, productName: l.productName, quantity: l.quantity, note: l.note, status: l.status as KitchenOrderLine["status"] }));
  }
  async setOrderStatus(hotelId: string, id: string, status: KitchenOrderStatus, actor?: string): Promise<KitchenOrder> {
    const o = await prisma.kitchenOrder.update({
      where: { id, hotelId },
      data: {
        status,
        startedAt: status === "PREPARING" ? new Date() : undefined,
        readyAt: status === "READY" ? new Date() : undefined,
        servedAt: status === "SERVED" ? new Date() : undefined,
      },
    });
    return mapOrder(o);
  }
  async listOrders(filter: KitchenFilter): Promise<{ orders: KitchenOrder[]; total: number }> {
    const where: Record<string, unknown> = { hotelId: filter.hotelId, stationId: filter.stationId, status: filter.status, priority: filter.priority };
    const [rows, total] = await prisma.$transaction([
      prisma.kitchenOrder.findMany({ where, orderBy: { receivedAt: "asc" }, skip: filter.offset ?? 0, take: filter.limit ?? 100 }),
      prisma.kitchenOrder.count({ where }),
    ]);
    return { orders: rows.map(mapOrder), total };
  }
  async addOrderLines(id: string, lines: { productId: string; productName: string; quantity: number; note?: string | null }[]): Promise<void> {
    await prisma.kitchenOrderLine.createMany({ data: lines.map((l) => ({ kitchenOrderId: id, productId: l.productId, productName: l.productName, quantity: l.quantity, note: l.note ?? null })) });
  }
  async setLineStatus(id: string, lineId: string, status: KitchenOrderLine["status"]): Promise<void> {
    await prisma.kitchenOrderLine.update({ where: { id: lineId, kitchenOrderId: id }, data: { status } });
  }
  async logOrderEvent(id: string, action: string, actor?: string, detail?: string): Promise<void> {
    await prisma.kitchenOrderEvent.create({ data: { kitchenOrderId: id, action, actor: actor ?? null, detail: detail ?? null } });
  }
  async getPosOrderLines(posOrderId: string): Promise<{ productId: string; productName: string; quantity: number }[]> {
    const rows = await prisma.posOrderLine.findMany({ where: { orderId: posOrderId } });
    return rows.map((l) => ({ productId: l.productId, productName: l.productName, quantity: l.quantity }));
  }
  async nextKitchenRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.kitchenOrder.findFirst({ where: { kitchenRef: { startsWith: `KO-${year}-` } }, orderBy: { kitchenRef: "desc" }, select: { kitchenRef: true } });
    const seq = last ? parseInt(last.kitchenRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `KO-${year}-${String(seq).padStart(4, "0")}`;
  }
}

type OrderRow = {
  id: string; hotelId: string; posOrderId: string; stationId: string; kitchenRef: string; status: string;
  priority: string; notes: string | null; posPointId: string | null; reservationId: string | null; roomId: string | null;
  receivedAt: Date; startedAt: Date | null; readyAt: Date | null; servedAt: Date | null; createdAt: Date; updatedAt: Date;
};
function mapOrder(o: OrderRow): KitchenOrder {
  return {
    id: o.id, hotelId: o.hotelId, posOrderId: o.posOrderId, stationId: o.stationId, kitchenRef: o.kitchenRef,
    status: o.status as KitchenOrder["status"], priority: o.priority as KitchenOrder["priority"], notes: o.notes,
    posPointId: o.posPointId, reservationId: o.reservationId, roomId: o.roomId, receivedAt: o.receivedAt,
    startedAt: o.startedAt, readyAt: o.readyAt, servedAt: o.servedAt, createdAt: o.createdAt, updatedAt: o.updatedAt,
  };
}
