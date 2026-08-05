/**
 * Module 13 — POS : adapter Prisma.
 */
import type {
  PosRepository,
  CreateMenuLineInput,
  CreatePosOrderInput,
  CreatePosPointInput,
  PosMenuLine,
  PosOrder,
  PosOrderLine,
  PosOrderStatus,
  PosPaymentInput,
  PosPoint,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaPosRepository implements PosRepository {
  async createPosPoint(hotelId: string, input: CreatePosPointInput): Promise<PosPoint> {
    const p = await prisma.posPoint.create({ data: { hotelId, name: input.name, kind: input.kind ?? "RESTAURANT" } });
    return mapPosPoint(p);
  }
  async listPosPoints(hotelId: string): Promise<PosPoint[]> {
    const rows = await prisma.posPoint.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map(mapPosPoint);
  }
  async posPointExists(hotelId: string, id: string): Promise<boolean> {
    const p = await prisma.posPoint.findFirst({ where: { id, hotelId } });
    return p !== null;
  }
  async createMenu(hotelId: string, posPointId: string, name: string): Promise<{ id: string }> {
    const m = await prisma.posMenu.create({ data: { hotelId, posPointId, name } });
    return { id: m.id };
  }
  async addMenuLine(hotelId: string, menuId: string, input: CreateMenuLineInput): Promise<PosMenuLine> {
    const l = await prisma.posMenuLine.create({ data: { menuId, productId: input.productId, price: input.price, currency: input.currency ?? "XOF", taxRate: input.taxRate ?? 0 } });
    return { id: l.id, menuId: l.menuId, productId: l.productId, price: l.price, currency: l.currency, taxRate: Number(l.taxRate) };
  }
  async listMenuLines(hotelId: string, posPointId: string): Promise<(PosMenuLine & { productName?: string })[]> {
    const menus = await prisma.posMenu.findMany({ where: { hotelId, posPointId } });
    const menuIds = menus.map((m) => m.id);
    const rows = await prisma.posMenuLine.findMany({ where: { menuId: { in: menuIds }, isActive: true }, include: { product: { select: { name: true } } } });
    return rows.map((l) => ({ id: l.id, menuId: l.menuId, productId: l.productId, price: l.price, currency: l.currency, taxRate: Number(l.taxRate), productName: l.product.name }));
  }
  async getProduct(hotelId: string, productId: string): Promise<{ id: string; name: string; price: number; taxRate: number; currency: string } | null> {
    const p = await prisma.product.findFirst({ where: { id: productId, hotelId } });
    return p ? { id: p.id, name: p.name, price: p.price, taxRate: Number(p.taxRate), currency: p.currency } : null;
  }
  async createOrder(hotelId: string, input: CreatePosOrderInput & { orderRef: string; createdBy?: string }): Promise<PosOrder> {
    const o = await prisma.posOrder.create({
      data: { hotelId, posPointId: input.posPointId, reservationId: input.reservationId ?? null, roomId: input.roomId ?? null, orderRef: input.orderRef, createdBy: input.createdBy ?? null },
    });
    return mapPosOrder(o);
  }
  async addOrderLines(orderId: string, lines: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; taxRate: number }[]): Promise<void> {
    await prisma.posOrderLine.createMany({
      data: lines.map((l) => ({ orderId, productId: l.productId, productName: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal, taxRate: l.taxRate })),
    });
  }
  async setOrderStatus(hotelId: string, orderId: string, status: PosOrderStatus): Promise<PosOrder> {
    const o = await prisma.posOrder.update({ where: { id: orderId, hotelId }, data: { status } });
    return mapPosOrder(o);
  }
  async getOrder(hotelId: string, orderId: string): Promise<PosOrder | null> {
    const o = await prisma.posOrder.findFirst({ where: { id: orderId, hotelId } });
    return o ? mapPosOrder(o) : null;
  }
  async getOrderLines(orderId: string): Promise<PosOrderLine[]> {
    const rows = await prisma.posOrderLine.findMany({ where: { orderId } });
    return rows.map((l) => ({ id: l.id, orderId: l.orderId, productId: l.productId, productName: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal, taxRate: Number(l.taxRate) }));
  }
  async listOrders(hotelId: string, status?: PosOrderStatus): Promise<PosOrder[]> {
    const rows = await prisma.posOrder.findMany({ where: { hotelId, status }, orderBy: { createdAt: "desc" } });
    return rows.map(mapPosOrder);
  }
  async logOrderEvent(orderId: string, action: string, actor?: string, detail?: string): Promise<void> {
    await prisma.posOrderEvent.create({ data: { orderId, action, actor: actor ?? null, detail: detail ?? null } });
  }
  async recordPayment(hotelId: string, input: PosPaymentInput, receivedBy?: string): Promise<void> {
    await prisma.posPayment.create({ data: { hotelId, orderId: input.orderId, amount: input.amount, method: input.method, reference: input.reference ?? null, receivedBy } });
  }
  async getRevenue(hotelId: string): Promise<number> {
    const agg = await prisma.posOrder.aggregate({ where: { hotelId, status: "PAID" }, _sum: { total: true } });
    return agg._sum.total ?? 0;
  }
  async nextOrderRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.posOrder.findFirst({ where: { orderRef: { startsWith: `PO-${year}-` } }, orderBy: { orderRef: "desc" }, select: { orderRef: true } });
    const seq = last ? parseInt(last.orderRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `PO-${year}-${String(seq).padStart(4, "0")}`;
  }
}

type PosPointRow = { id: string; hotelId: string; name: string; kind: string; isActive: boolean; createdAt: Date; updatedAt: Date };
function mapPosPoint(p: PosPointRow): PosPoint {
  return { id: p.id, hotelId: p.hotelId, name: p.name, kind: p.kind as PosPoint["kind"], isActive: p.isActive };
}
type PosOrderRow = { id: string; hotelId: string; posPointId: string; reservationId: string | null; roomId: string | null; orderRef: string; status: string; subtotal: number; taxAmount: number; discountAmount: number; total: number; currency: string; createdBy: string | null; createdAt: Date; updatedAt: Date };
function mapPosOrder(o: PosOrderRow): PosOrder {
  return { id: o.id, hotelId: o.hotelId, posPointId: o.posPointId, reservationId: o.reservationId, roomId: o.roomId, orderRef: o.orderRef, status: o.status as PosOrder["status"], subtotal: o.subtotal, taxAmount: o.taxAmount, discountAmount: o.discountAmount, total: o.total, currency: o.currency, createdBy: o.createdBy, createdAt: o.createdAt, updatedAt: o.updatedAt };
}
