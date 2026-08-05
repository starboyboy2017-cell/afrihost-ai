/**
 * Module 15 — Caisse : port de persistance.
 */
import type {
  CashMovement,
  CashMovementInput,
  CashRegister,
  CashSession,
  CashSessionStatus,
  CloseSessionInput,
  CreateCashRegisterInput,
  OpenSessionInput,
} from "./cash.types.js";

export interface CashRepository {
  // Caisses
  createRegister(hotelId: string, input: CreateCashRegisterInput): Promise<CashRegister>;
  listRegisters(hotelId: string): Promise<CashRegister[]>;
  registerExists(hotelId: string, registerId: string): Promise<boolean>;

  // Sessions
  openSession(hotelId: string, input: OpenSessionInput): Promise<CashSession>;
  getSession(hotelId: string, sessionId: string): Promise<CashSession | null>;
  getOpenSessionForRegister(hotelId: string, registerId: string): Promise<CashSession | null>;
  closeSession(hotelId: string, sessionId: string, data: { closingAmount: number; countedAmount: number; difference: number; note?: string | null }): Promise<CashSession>;
  listSessions(hotelId: string, status?: CashSessionStatus): Promise<CashSession[]>;

  // Mouvements
  addMovement(hotelId: string, input: CashMovementInput, createdBy?: string): Promise<CashMovement>;
  listMovements(hotelId: string, sessionId: string): Promise<CashMovement[]>;

  // Rapport
  getSessionMovementsSum(sessionId: string): Promise<{ type: string; method: string; sum: number }[]>;
}
