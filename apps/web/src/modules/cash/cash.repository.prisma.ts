/**
 * Module 15 — Caisse : adapter Prisma.
 */
import type {
  CashRepository,
  CashMovement,
  CashMovementInput,
  CashRegister,
  CashSession,
  CashSessionStatus,
  CreateCashRegisterInput,
  OpenSessionInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaCashRepository implements CashRepository {
  async createRegister(hotelId: string, input: CreateCashRegisterInput): Promise<CashRegister> {
    const r = await prisma.cashRegister.create({ data: { hotelId, name: input.name, posPointId: input.posPointId ?? null } });
    return { id: r.id, hotelId: r.hotelId, name: r.name, posPointId: r.posPointId, isActive: r.isActive };
  }
  async listRegisters(hotelId: string): Promise<CashRegister[]> {
    const rows = await prisma.cashRegister.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((r) => ({ id: r.id, hotelId: r.hotelId, name: r.name, posPointId: r.posPointId, isActive: r.isActive }));
  }
  async registerExists(hotelId: string, id: string): Promise<boolean> {
    const r = await prisma.cashRegister.findFirst({ where: { id, hotelId } });
    return r !== null;
  }
  async openSession(hotelId: string, input: OpenSessionInput): Promise<CashSession> {
    const s = await prisma.cashSession.create({ data: { hotelId, registerId: input.registerId, cashierId: input.cashierId ?? null, openingAmount: input.openingAmount ?? 0 } });
    return mapSession(s);
  }
  async getSession(hotelId: string, id: string): Promise<CashSession | null> {
    const s = await prisma.cashSession.findFirst({ where: { id, hotelId } });
    return s ? mapSession(s) : null;
  }
  async getOpenSessionForRegister(hotelId: string, registerId: string): Promise<CashSession | null> {
    const s = await prisma.cashSession.findFirst({ where: { hotelId, registerId, status: "OPEN" } });
    return s ? mapSession(s) : null;
  }
  async closeSession(hotelId: string, id: string, data: { closingAmount: number; countedAmount: number; difference: number; note?: string | null }): Promise<CashSession> {
    const s = await prisma.cashSession.update({
      where: { id, hotelId },
      data: { status: "CLOSED", closedAt: new Date(), closingAmount: data.closingAmount, countedAmount: data.countedAmount, difference: data.difference, note: data.note ?? null },
    });
    return mapSession(s);
  }
  async listSessions(hotelId: string, status?: CashSessionStatus): Promise<CashSession[]> {
    const rows = await prisma.cashSession.findMany({ where: { hotelId, status }, orderBy: { openedAt: "desc" } });
    return rows.map(mapSession);
  }
  async addMovement(hotelId: string, input: CashMovementInput, createdBy?: string): Promise<CashMovement> {
    const m = await prisma.cashMovement.create({
      data: { hotelId, sessionId: input.sessionId, type: input.type, method: input.method, amount: input.amount, reference: input.reference ?? null, note: input.note ?? null, createdBy: createdBy ?? null },
    });
    return mapMovement(m);
  }
  async listMovements(hotelId: string, sessionId: string): Promise<CashMovement[]> {
    const rows = await prisma.cashMovement.findMany({ where: { hotelId, sessionId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapMovement);
  }
  async getSessionMovementsSum(sessionId: string): Promise<{ type: string; method: string; sum: number }[]> {
    const rows = await prisma.cashMovement.groupBy({ by: ["type", "method"], where: { sessionId }, _sum: { amount: true } });
    return rows.map((r) => ({ type: r.type, method: r.method, sum: r._sum.amount ?? 0 }));
  }
}

type SessionRow = { id: string; hotelId: string; registerId: string; cashierId: string | null; status: string; openedAt: Date; closedAt: Date | null; openingAmount: number; closingAmount: number | null; countedAmount: number | null; difference: number | null; note: string | null; createdAt: Date; updatedAt: Date };
function mapSession(s: SessionRow): CashSession {
  return { id: s.id, hotelId: s.hotelId, registerId: s.registerId, cashierId: s.cashierId, status: s.status as CashSession["status"], openedAt: s.openedAt, closedAt: s.closedAt, openingAmount: s.openingAmount, closingAmount: s.closingAmount, countedAmount: s.countedAmount, difference: s.difference, note: s.note, createdAt: s.createdAt, updatedAt: s.updatedAt };
}
type MovementRow = { id: string; hotelId: string; sessionId: string; type: string; method: string; amount: number; reference: string | null; note: string | null; createdBy: string | null; createdAt: Date };
function mapMovement(m: MovementRow): CashMovement {
  return { id: m.id, hotelId: m.hotelId, sessionId: m.sessionId, type: m.type as CashMovement["type"], method: m.method as CashMovement["method"], amount: m.amount, reference: m.reference, note: m.note, createdBy: m.createdBy, createdAt: m.createdAt };
}
