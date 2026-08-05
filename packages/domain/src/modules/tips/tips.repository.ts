/**
 * Module 16 — Pourboires : port de persistance.
 */
import type {
  CreateTipInput,
  CreateTipRuleInput,
  Tip,
  TipAllocation,
  TipFilter,
  TipRule,
  TipStatus,
} from "./tips.types.js";

export interface TipsRepository {
  // Règles
  createRule(hotelId: string, input: CreateTipRuleInput): Promise<TipRule>;
  listRules(hotelId: string, activeOnly?: boolean): Promise<TipRule[]>;
  getRule(hotelId: string, ruleId: string): Promise<TipRule | null>;

  // Pourboires
  createTip(hotelId: string, input: CreateTipInput): Promise<Tip>;
  getTip(hotelId: string, tipId: string): Promise<Tip | null>;
  setTipStatus(hotelId: string, tipId: string, status: TipStatus, meta?: { by?: string; at?: Date }): Promise<Tip>;
  listTips(filter: TipFilter): Promise<{ tips: Tip[]; total: number }>;

  // Répartitions
  addAllocation(tipId: string, recipient: string, amount: number): Promise<TipAllocation>;
  listAllocations(tipId: string): Promise<TipAllocation[]>;

  // Événements / traçabilité
  logTipEvent(tipId: string, action: string, actor?: string, detail?: string): Promise<void>;

  /** Vérifie que le paiement POS appartient à l'hôtel (si fourni). */
  posPaymentExists(hotelId: string, posPaymentId: string): Promise<boolean>;
}
