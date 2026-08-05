import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { CashService, type CashActor } from "./cash.service.js";
import { CashError } from "./cash.error.js";
import type { CashRepository } from "./cash.repository.js";
import type {
  CashMovement,
  CashMovementInput,
  CashRegister,
  CashSession,
  CashSessionStatus,
  CreateCashRegisterInput,
  OpenSessionInput,
} from "./cash.types.js";

class MemoryRepo implements CashRepository {
  registers = new Map<string, CashRegister>();
  sessions = new Map<string, CashSession>();
  movements: CashMovement[] = [];
  seq = 0;

  async createRegister(hotelId: string, input: CreateCashRegisterInput): Promise<CashRegister> {
    const r: CashRegister = { id: `cr-${++this.seq}`, hotelId, name: input.name, posPointId: input.posPointId ?? null, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    this.registers.set(r.id, r);
    return r;
  }
  async listRegisters(hotelId: string): Promise<CashRegister[]> { return [...this.registers.values()].filter((r) => r.hotelId === hotelId); }
  async registerExists(hotelId: string, id: string): Promise<boolean> { const r = this.registers.get(id); return !!r && r.hotelId === hotelId; }
  async openSession(hotelId: string, input: OpenSessionInput): Promise<CashSession> {
    const s: CashSession = { id: `cs-${++this.seq}`, hotelId, registerId: input.registerId, cashierId: input.cashierId ?? null, status: "OPEN", openedAt: new Date(), openingAmount: input.openingAmount ?? 0, createdAt: new Date(), updatedAt: new Date() };
    this.sessions.set(s.id, s);
    return s;
  }
  async getSession(hotelId: string, id: string): Promise<CashSession | null> { const s = this.sessions.get(id); return s && s.hotelId === hotelId ? s : null; }
  async getOpenSessionForRegister(hotelId: string, registerId: string): Promise<CashSession | null> {
    return [...this.sessions.values()].find((s) => s.hotelId === hotelId && s.registerId === registerId && s.status === "OPEN") ?? null;
  }
  async closeSession(hotelId: string, id: string, data: { closingAmount: number; countedAmount: number; difference: number; note?: string | null }): Promise<CashSession> {
    const s = this.sessions.get(id)!;
    const next = { ...s, status: "CLOSED" as CashSessionStatus, closedAt: new Date(), closingAmount: data.closingAmount, countedAmount: data.countedAmount, difference: data.difference, note: data.note ?? null, updatedAt: new Date() } as CashSession;
    this.sessions.set(id, next);
    return next;
  }
  async listSessions(hotelId: string, status?: CashSessionStatus): Promise<CashSession[]> {
    return [...this.sessions.values()].filter((s) => s.hotelId === hotelId && (!status || s.status === status));
  }
  async addMovement(hotelId: string, input: CashMovementInput, createdBy?: string): Promise<CashMovement> {
    const m: CashMovement = { id: `cm-${++this.seq}`, hotelId, sessionId: input.sessionId, type: input.type, method: input.method, amount: input.amount, reference: input.reference ?? null, note: input.note ?? null, createdBy: createdBy ?? null, createdAt: new Date() };
    this.movements.push(m);
    return m;
  }
  async listMovements(hotelId: string, sessionId: string): Promise<CashMovement[]> { return this.movements.filter((m) => m.hotelId === hotelId && m.sessionId === sessionId); }
  async getSessionMovementsSum(sessionId: string): Promise<{ type: string; method: string; sum: number }[]> {
    const map = new Map<string, { type: string; method: string; sum: number }>();
    for (const m of this.movements.filter((m) => m.sessionId === sessionId)) {
      const key = `${m.type}|${m.method}`;
      const e = map.get(key) ?? { type: m.type, method: m.method, sum: 0 };
      e.sum += m.amount;
      map.set(key, e);
    }
    return [...map.values()];
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new CashService(repo, audit, bus);
  const actor: CashActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 15 — Caisse", () => {
  it("crée plusieurs caisses par hôtel", async () => {
    const { service, actor } = setup();
    await service.createRegister("h1", { name: "Caisse réception" }, actor);
    await service.createRegister("h1", { name: "Caisse restaurant" }, actor);
    const registers = await service.listRegisters("h1", actor);
    expect(registers.length).toBe(2);
  });

  it("ouvre une session avec fonds d'ouverture + mouvement OPENING", async () => {
    const { repo, service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse réception" }, actor);
    const session = await service.openSession("h1", { registerId: reg.id, openingAmount: 5000 }, actor);
    expect(session.status).toBe("OPEN");
    const movements = repo.movements.filter((m) => m.sessionId === session.id);
    expect(movements.some((m) => m.type === "OPENING" && m.amount === 5000)).toBe(true);
  });

  it("refuse d'ouvrir deux sessions sur la même caisse", async () => {
    const { service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse réception" }, actor);
    await service.openSession("h1", { registerId: reg.id }, actor);
    await expect(service.openSession("h1", { registerId: reg.id }, actor)).rejects.toThrow(/déjà ouverte/);
  });

  it("enregistre des mouvements multi-moyens (SALE CASH + SALE MOBILE_MONEY)", async () => {
    const { service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse" }, actor);
    const session = await service.openSession("h1", { registerId: reg.id }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "SALE", method: "CASH", amount: 5000 }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "SALE", method: "MOBILE_MONEY", amount: 3000 }, actor);
    const report = await service.buildReport("h1", session.id, actor);
    expect(report.byMethod.CASH).toBe(5000);
    expect(report.byMethod.MOBILE_MONEY).toBe(3000);
  });

  it("clôture avec réconciliation : calcule l'écart (compté vs théorique)", async () => {
    const { service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse" }, actor);
    const session = await service.openSession("h1", { registerId: reg.id, openingAmount: 1000 }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "SALE", method: "CASH", amount: 5000 }, actor);
    // théorique = 1000 + 5000 = 6000 ; compté = 5800 → écart -200
    const closed = await service.closeSession("h1", { sessionId: session.id, countedAmount: 5800 }, actor);
    expect(closed.status).toBe("CLOSED");
    expect(closed.closingAmount).toBe(6000);
    expect(closed.difference).toBe(-200);
  });

  it("gère remboursements et dépenses dans le rapport", async () => {
    const { service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse" }, actor);
    const session = await service.openSession("h1", { registerId: reg.id, openingAmount: 1000 }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "SALE", method: "CASH", amount: 5000 }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "REFUND", method: "CASH", amount: 1000 }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "EXPENSE", method: "CASH", amount: 500 }, actor);
    const report = await service.buildReport("h1", session.id, actor);
    // théorique = 1000 + 5000 - 1000 - 500 = 4500
    expect(report.totalRefund).toBe(1000);
    expect(report.totalExpense).toBe(500);
    expect(report.expectedClosing).toBe(4500);
  });

  it("refuse un mouvement sur une session fermée", async () => {
    const { service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse" }, actor);
    const session = await service.openSession("h1", { registerId: reg.id }, actor);
    await service.closeSession("h1", { sessionId: session.id, countedAmount: 0 }, actor);
    await expect(service.addMovement("h1", { sessionId: session.id, type: "SALE", method: "CASH", amount: 100 }, actor)).rejects.toThrow(/fermée/);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: CashActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createRegister("h1", { name: "X" }, other)).rejects.toThrow(CashError);
  });

  it("journalise les ouvertures, mouvements et clôtures", async () => {
    const { writer, service, actor } = setup();
    const reg = await service.createRegister("h1", { name: "Caisse" }, actor);
    const session = await service.openSession("h1", { registerId: reg.id, openingAmount: 1000 }, actor);
    await service.addMovement("h1", { sessionId: session.id, type: "SALE", method: "CASH", amount: 5000 }, actor);
    expect(writer.entries.some((e) => e.action === "caisse.open")).toBe(true);
    expect(writer.entries.some((e) => e.action === "caisse.movement.sale")).toBe(true);
  });
});
