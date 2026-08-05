/**
 * Module 15 — Caisse : service métier.
 *
 * Fonctionnalités :
 *   - **caisses** (plusieurs par hôtel, liées optionnellement à un point de vente) ;
 *   - **ouvertures / fermetures** de session (avec fonds d'ouverture) ;
 *   - **mouvements de caisse** (multi-moyens, remboursements, annulations, dépenses) ;
 *   - **clôture avec réconciliation** (écart entre compté et théorique) ;
 *   - **rapports financiers** par session et par moyen de paiement.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC caisse.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { CashError } from "./cash.error.js";
import type { CashRepository } from "./cash.repository.js";
import type {
  CashMovement,
  CashMovementInput,
  CashMovementType,
  CashRegister,
  CashReport,
  CashSession,
  CloseSessionInput,
  CreateCashRegisterInput,
  OpenSessionInput,
} from "./cash.types.js";
import {
  validateCashMovement,
  validateCloseSession,
  validateCreateCashRegister,
  validateOpenSession,
} from "./cash.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface CashActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class CashService {
  constructor(
    private readonly repo: CashRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée une caisse (plusieurs par hôtel). */
  async createRegister(hotelId: string, input: CreateCashRegisterInput, actor: CashActor): Promise<CashRegister> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateCashRegister(input);
    const register = await this.repo.createRegister(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "caisse.register.create", entityType: "CashRegister", entityId: register.id, after: { name: register.name },
    });
    return register;
  }

  /** Liste les caisses. */
  async listRegisters(hotelId: string, actor: CashActor): Promise<CashRegister[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRegisters(hotelId);
  }

  /** Ouvre une session de caisse (fonds d'ouverture). */
  async openSession(hotelId: string, input: OpenSessionInput, actor: CashActor): Promise<CashSession> {
    this.assertHotel(hotelId, actor);
    const v = validateOpenSession(input);
    if (!(await this.repo.registerExists(hotelId, v.registerId))) throw new CashError("Caisse introuvable");
    const existing = await this.repo.getOpenSessionForRegister(hotelId, v.registerId);
    if (existing) throw new CashError("Une session est déjà ouverte sur cette caisse");

    const session = await this.repo.openSession(hotelId, v);
    // Mouvement d'ouverture
    const opening = v.openingAmount ?? 0;
    if (opening > 0) {
      await this.repo.addMovement(hotelId, { sessionId: session.id, type: "OPENING", method: "CASH", amount: opening, note: "Fonds d'ouverture" }, actor.actorUserId);
    }
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "caisse.open", entityType: "CashSession", entityId: session.id,
      after: { registerId: v.registerId, openingAmount: v.openingAmount, status: "OPEN" },
    });
    return session;
  }

  /** Enregistre un mouvement de caisse. */
  async addMovement(hotelId: string, input: CashMovementInput, actor: CashActor): Promise<CashMovement> {
    this.assertHotel(hotelId, actor);
    const v = validateCashMovement(input);
    const session = await this.repo.getSession(hotelId, v.sessionId);
    if (!session) throw new CashError("Session de caisse introuvable");
    if (session.status !== "OPEN") throw new CashError("La session est fermée");

    const movement = await this.repo.addMovement(hotelId, v, actor.actorUserId);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: `caisse.movement.${v.type.toLowerCase()}`, entityType: "CashMovement", entityId: movement.id,
      after: { sessionId: v.sessionId, type: v.type, method: v.method, amount: v.amount },
    });
    return movement;
  }

  /**
   * Clôture la session avec **réconciliation** : compare le total compté au total
   * théorique, calcule l'écart, et enregistre un mouvement CLOSING.
   */
  async closeSession(hotelId: string, input: CloseSessionInput, actor: CashActor): Promise<CashSession> {
    this.assertHotel(hotelId, actor);
    const v = validateCloseSession(input);
    const session = await this.repo.getSession(hotelId, v.sessionId);
    if (!session) throw new CashError("Session de caisse introuvable");
    if (session.status !== "OPEN") throw new CashError("La session est déjà fermée");

    const report = await this.buildReport(hotelId, v.sessionId, actor);
    const expectedClosing = report.expectedClosing;
    const difference = v.countedAmount - expectedClosing;

    const closed = await this.repo.closeSession(hotelId, v.sessionId, {
      countedAmount: v.countedAmount,
      closingAmount: expectedClosing,
      difference,
      note: v.note ?? `Écart: ${difference}`,
    });
    // Mouvement de clôture
    await this.repo.addMovement(hotelId, {
      sessionId: v.sessionId, type: "CLOSING", method: "CASH", amount: expectedClosing, note: "Clôture de caisse",
    }, actor.actorUserId);
    if (difference !== 0) {
      await this.repo.addMovement(hotelId, {
        sessionId: v.sessionId, type: "RECONCILIATION", method: "CASH", amount: Math.abs(difference), note: `Écart de réconciliation (${difference})`,
      }, actor.actorUserId);
    }

    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "caisse.close", entityType: "CashSession", entityId: v.sessionId,
      after: { status: "CLOSED", expectedClosing, countedAmount: v.countedAmount, difference },
    });
    return closed;
  }

  /** Construit le rapport financier d'une session. */
  async buildReport(hotelId: string, sessionId: string, actor: CashActor): Promise<CashReport> {
    this.assertHotel(hotelId, actor);
    const session = await this.repo.getSession(hotelId, sessionId);
    if (!session) throw new CashError("Session de caisse introuvable");
    const sums = await this.repo.getSessionMovementsSum(sessionId);

    const byType = new Map<string, number>();
    const byMethod = new Map<string, number>();
    for (const s of sums) {
      byType.set(s.type, (byType.get(s.type) ?? 0) + s.sum);
      if (s.type === "SALE" || s.type === "PAYMENT" || s.type === "OPENING") {
        byMethod.set(s.method, (byMethod.get(s.method) ?? 0) + s.sum);
      }
    }
    const totalIn = (byType.get("OPENING") ?? 0) + (byType.get("SALE") ?? 0) + (byType.get("PAYMENT") ?? 0);
    const totalRefund = byType.get("REFUND") ?? 0;
    const totalExpense = byType.get("EXPENSE") ?? 0;
    const expectedClosing = totalIn - totalRefund - totalExpense;

    return {
      sessionId,
      openingAmount: session.openingAmount,
      totalIn,
      totalRefund,
      totalExpense,
      expectedClosing,
      countedAmount: session.countedAmount ?? null,
      difference: session.difference ?? null,
      byMethod: Object.fromEntries(byMethod),
    };
  }

  /** Liste les sessions. */
  async listSessions(hotelId: string, status: CashSession["status"] | undefined, actor: CashActor): Promise<CashSession[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listSessions(hotelId, status);
  }

  /** Liste les mouvements d'une session. */
  async listMovements(hotelId: string, sessionId: string, actor: CashActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.listMovements(hotelId, sessionId);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: CashActor): void {
    if (actor.hotelId !== hotelId) throw new CashError("Accès inter-hôtel refusé");
  }
}
