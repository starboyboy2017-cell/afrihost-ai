/**
 * Module 16 — Gestion des pourboires : service métier.
 *
 * Fonctionnalités :
 *   - enregistrement des pourboires **lors des paiements** (lien POS) ;
 *   - distinction **individuel / collectif** ;
 *   - **règles de répartition configurables par hôtel** (serveur/équipe/cuisine/autre) ;
 *   - **validation par les responsables** (PENDING → VALIDATED) ;
 *   - **distribution** (VALIDATED → DISTRIBUTED) + suivi des montants ;
 *   - multi-moyens (espèces, carte, mobile money) ;
 *   - **annulations / corrections** avec traçabilité ;
 *   - historique complet des répartitions.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC tips.*.
 * Chaque mutation est journalisée (audit) + événement TipEvent.
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { TipsError } from "./tips.error.js";
import type { TipsRepository } from "./tips.repository.js";
import type {
  CreateTipInput,
  CreateTipRuleInput,
  Tip,
  TipAllocation,
  TipFilter,
  TipRule,
  TipStatus,
} from "./tips.types.js";
import { validateCreateTip, validateCreateTipRule } from "./tips.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface TipsActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class TipsService {
  constructor(
    private readonly repo: TipsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Crée une règle de répartition (configurable par hôtel). */
  async createRule(hotelId: string, input: CreateTipRuleInput, actor: TipsActor): Promise<TipRule> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateTipRule(input);
    const rule = await this.repo.createRule(hotelId, v);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "tips.rule.create", entityType: "TipRule", entityId: rule.id,
      after: { name: rule.name, server: rule.serverPercent, team: rule.teamPercent, kitchen: rule.kitchenPercent },
    });
    return rule;
  }

  /** Liste les règles. */
  async listRules(hotelId: string, actor: TipsActor): Promise<TipRule[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listRules(hotelId, true);
  }

  /**
   * Enregistre un pourboire (au moment d'un paiement).
   * - INDIVIDUAL : bénéficiaire direct ;
   * - COLLECTIVE : applique la règle → répartit entre serveur/équipe/cuisine.
   */
  async recordTip(hotelId: string, input: CreateTipInput, actor: TipsActor): Promise<Tip> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateTip(input);
    if (v.posPaymentId && !(await this.repo.posPaymentExists(hotelId, v.posPaymentId))) {
      throw new TipsError("Paiement POS introuvable");
    }
    const tip = await this.repo.createTip(hotelId, v);
    await this.repo.logTipEvent(tip.id, "created", actor.actorUserId, v.type);

    // Répartition immédiate si collectif
    if (v.type === "COLLECTIVE" && v.tipRuleId) {
      const rule = await this.repo.getRule(hotelId, v.tipRuleId);
      if (!rule) throw new TipsError("Règle de répartition introuvable");
      const allocs: { recipient: string; amount: number }[] = [
        { recipient: "server", amount: Math.round(tip.amount * rule.serverPercent / 100) },
        { recipient: "team", amount: Math.round(tip.amount * rule.teamPercent / 100) },
        { recipient: "kitchen", amount: Math.round(tip.amount * rule.kitchenPercent / 100) },
      ];
      if (rule.otherPercent > 0) allocs.push({ recipient: "other", amount: Math.round(tip.amount * rule.otherPercent / 100) });
      for (const a of allocs) {
        if (a.amount > 0) await this.repo.addAllocation(tip.id, a.recipient, a.amount);
      }
    } else if (v.type === "INDIVIDUAL" && v.recipient) {
      await this.repo.addAllocation(tip.id, v.recipient, tip.amount);
    }

    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: "tips.create", entityType: "Tip", entityId: tip.id,
      after: { type: v.type, amount: v.amount, method: v.method, status: "PENDING" },
    });
    return tip;
  }

  /** Valide un pourboire (par un responsable) : PENDING → VALIDATED. */
  async validate(hotelId: string, tipId: string, actor: TipsActor): Promise<Tip> {
    return this.transition(hotelId, tipId, "VALIDATED", actor, "validate");
  }

  /** Distribue un pourboire validé : VALIDATED → DISTRIBUTED. */
  async distribute(hotelId: string, tipId: string, actor: TipsActor): Promise<Tip> {
    return this.transition(hotelId, tipId, "DISTRIBUTED", actor, "distribute");
  }

  /** Annule un pourboire : → CANCELLED (traçable). */
  async cancel(hotelId: string, tipId: string, actor: TipsActor, reason?: string): Promise<Tip> {
    return this.transition(hotelId, tipId, "CANCELLED", actor, "cancel", reason);
  }

  /** Transition générique avec validation d'état + audit + événement. */
  private async transition(hotelId: string, tipId: string, to: TipStatus, actor: TipsActor, action: string, detail?: string): Promise<Tip> {
    this.assertHotel(hotelId, actor);
    const tip = await this.repo.getTip(hotelId, tipId);
    if (!tip) throw new TipsError("Pourboire introuvable");
    assertTipTransition(tip.status, to);
    const updated = await this.repo.setTipStatus(hotelId, tipId, to, { by: actor.actorUserId, at: new Date() });
    await this.repo.logTipEvent(tipId, action, actor.actorUserId, detail);
    await this.audit.write({
      organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId,
      action: `tips.${action}`, entityType: "Tip", entityId: tipId,
      before: { status: tip.status }, after: { status: to },
    });
    return updated;
  }

  /** Suivi : liste les pourboires (avec montants distribués / en attente). */
  async listTips(hotelId: string, filter: Omit<TipFilter, "hotelId">, actor: TipsActor): Promise<{ tips: Tip[]; total: number; pendingTotal: number; distributedTotal: number }> {
    this.assertHotel(hotelId, actor);
    const { tips, total } = await this.repo.listTips({ hotelId, ...filter });
    const pendingTotal = tips.filter((t) => t.status === "PENDING" || t.status === "VALIDATED").reduce((s, t) => s + t.amount, 0);
    const distributedTotal = tips.filter((t) => t.status === "DISTRIBUTED").reduce((s, t) => s + t.amount, 0);
    return { tips, total, pendingTotal, distributedTotal };
  }

  /** Historique des répartitions d'un pourboire. */
  async allocations(hotelId: string, tipId: string, actor: TipsActor): Promise<TipAllocation[]> {
    this.assertHotel(hotelId, actor);
    const tip = await this.repo.getTip(hotelId, tipId);
    if (!tip) throw new TipsError("Pourboire introuvable");
    return this.repo.listAllocations(tipId);
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: TipsActor): void {
    if (actor.hotelId !== hotelId) throw new TipsError("Accès inter-hôtel refusé");
  }
}

/** Transitions autorisées des pourboires. */
const TIP_TRANSITIONS: Record<TipStatus, TipStatus[]> = {
  PENDING: ["VALIDATED", "CANCELLED"],
  VALIDATED: ["DISTRIBUTED", "CANCELLED"],
  DISTRIBUTED: [],
  CANCELLED: [],
};
function assertTipTransition(from: TipStatus, to: TipStatus): void {
  if (from === to) return;
  const allowed = TIP_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new TipsError(`Transition de pourboire illégale : ${from} → ${to}`);
  }
}
