/**
 * Module 20 — Paiements & facturation : adapter Prisma.
 */
import type {
  BillingRepository,
  AddFolioLineInput,
  BillingPaymentInput,
  CreateFolioInput,
  CreateGatewayInput,
  Folio,
  FolioLine,
  PaymentGateway,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaBillingRepository implements BillingRepository {
  async createFolio(hotelId: string, input: CreateFolioInput & { folioRef: string }): Promise<Folio> {
    const f = await prisma.folio.create({
      data: { hotelId, guestId: input.guestId, reservationId: input.reservationId ?? null, folioRef: input.folioRef, name: input.name ?? null, groupRef: input.groupRef ?? null, currency: input.currency ?? "XOF" },
    });
    return mapFolio(f);
  }
  async getFolio(hotelId: string, id: string): Promise<Folio | null> {
    const f = await prisma.folio.findFirst({ where: { id, hotelId } });
    return f ? mapFolio(f) : null;
  }
  async listFolios(hotelId: string, groupRef?: string): Promise<Folio[]> {
    const rows = await prisma.folio.findMany({ where: { hotelId, ...(groupRef ? { groupRef } : {}) }, orderBy: { createdAt: "desc" } });
    return rows.map(mapFolio);
  }
  async setFolioStatus(hotelId: string, id: string, status: Folio["status"]): Promise<Folio> {
    const f = await prisma.folio.update({ where: { id, hotelId }, data: { status } });
    return mapFolio(f);
  }
  async nextFolioRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.folio.findFirst({ where: { folioRef: { startsWith: `FL-${year}-` } }, orderBy: { folioRef: "desc" }, select: { folioRef: true } });
    const seq = last ? parseInt(last.folioRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `FL-${year}-${String(seq).padStart(4, "0")}`;
  }
  async addLine(hotelId: string, input: AddFolioLineInput): Promise<FolioLine> {
    const l = await prisma.folioLine.create({
      data: { folioId: input.folioId, chargeType: input.chargeType, description: input.description, quantity: input.quantity ?? 1, unitPrice: input.unitPrice, amount: (input.quantity ?? 1) * input.unitPrice, taxRate: input.taxRate ?? 0, sourceRef: input.sourceRef ?? null },
    });
    return mapLine(l);
  }
  async getLines(hotelId: string, folioId: string): Promise<FolioLine[]> {
    const rows = await prisma.folioLine.findMany({ where: { folioId } });
    return rows.map(mapLine);
  }
  async moveLine(lineId: string, targetFolioId: string): Promise<void> {
    await prisma.folioLine.update({ where: { id: lineId }, data: { folioId: targetFolioId } });
  }
  async voidLine(hotelId: string, lineId: string): Promise<void> {
    await prisma.folioLine.update({ where: { id: lineId }, data: { voided: true } });
  }
  async createGateway(hotelId: string, input: CreateGatewayInput): Promise<PaymentGateway> {
    const g = await prisma.paymentGateway.create({ data: { hotelId, name: input.name, provider: input.provider, config: input.config as import("@prisma/client").Prisma.InputJsonValue | undefined } });
    return { id: g.id, hotelId: g.hotelId, name: g.name, provider: g.provider, isActive: g.isActive, config: g.config as Record<string, unknown> | null };
  }
  async listGateways(hotelId: string): Promise<PaymentGateway[]> {
    const rows = await prisma.paymentGateway.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((g) => ({ id: g.id, hotelId: g.hotelId, name: g.name, provider: g.provider, isActive: g.isActive, config: g.config as Record<string, unknown> | null }));
  }
  async recordPayment(hotelId: string, input: BillingPaymentInput, receivedBy?: string): Promise<void> {
    const folio = await prisma.folio.findFirst({ where: { id: input.folioId, hotelId } });
    await prisma.payment.create({
      data: { hotelId, folioId: input.folioId, invoiceId: input.invoiceId ?? null, amount: input.amount, currency: folio?.currency ?? "XOF", method: input.method, status: "PAID", kind: input.kind ?? "FULL", gatewayId: input.gatewayId ?? null, reference: input.reference ?? null, receivedAt: new Date(), createdBy: receivedBy ?? null },
    });
  }
  async listPayments(hotelId: string, folioId: string) {
    const rows = await prisma.payment.findMany({ where: { hotelId, folioId } });
    return rows.map((p) => ({ id: p.id, amount: p.amount, method: p.method, kind: p.kind }));
  }
  async getFolioPaidTotal(hotelId: string, folioId: string): Promise<number> {
    const agg = await prisma.payment.aggregate({ where: { hotelId, folioId }, _sum: { amount: true } });
    return agg._sum.amount ?? 0;
  }
  async generateInvoice(folioId: string, data: { number: string; subtotal: number; taxAmount: number; total: number }): Promise<{ id: string }> {
    const folio = await prisma.folio.findUnique({ where: { id: folioId } });
    const inv = await prisma.invoice.create({
      data: { hotelId: folio!.hotelId, folioId, guestId: folio!.guestId, number: data.number, type: "CONSOLIDATED", status: "OPEN", subtotal: data.subtotal, taxAmount: data.taxAmount, discountAmount: 0, total: data.total, currency: folio!.currency },
    });
    return { id: inv.id };
  }
  async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.invoice.findFirst({ where: { number: { startsWith: `INV-${year}-` } }, orderBy: { number: "desc" }, select: { number: true } });
    const seq = last ? parseInt(last.number.split("-")[2] ?? "0", 10) + 1 : 1;
    return `INV-${year}-${String(seq).padStart(4, "0")}`;
  }
  async getFolioLinesTotal(hotelId: string, folioId: string): Promise<{ subtotal: number; taxAmount: number }> {
    const lines = await prisma.folioLine.findMany({ where: { folioId, voided: false } });
    let subtotal = 0, tax = 0;
    for (const l of lines) { subtotal += l.amount; tax += Math.round(l.amount * Number(l.taxRate)); }
    return { subtotal, taxAmount: tax };
  }
}

type FolioRow = { id: string; hotelId: string; reservationId: string | null; guestId: string; folioRef: string; name: string | null; status: string; groupRef: string | null; currency: string; createdAt: Date; updatedAt: Date };
function mapFolio(f: FolioRow): Folio {
  return { id: f.id, hotelId: f.hotelId, reservationId: f.reservationId, guestId: f.guestId, folioRef: f.folioRef, name: f.name, status: f.status as Folio["status"], groupRef: f.groupRef, currency: f.currency, createdAt: f.createdAt, updatedAt: f.updatedAt };
}
type LineRow = { id: string; folioId: string; chargeType: string; description: string; quantity: number; unitPrice: number; amount: number; taxRate: import("@prisma/client").Prisma.Decimal; sourceRef: string | null; postedAt: Date; voided: boolean };
function mapLine(l: LineRow): FolioLine {
  return { id: l.id, folioId: l.folioId, chargeType: l.chargeType as FolioLine["chargeType"], description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, amount: l.amount, taxRate: Number(l.taxRate), sourceRef: l.sourceRef, postedAt: l.postedAt, voided: l.voided };
}
