/**
 * Module 20 — Paiements & facturation : service métier.
 *
 * Fonctionnalités :
 *   - **folios clients** centralisant tous les frais (hébergement, restauration,
 *     room service, blanchisserie, transport, maintenance, minibar, autres) ;
 *   - **transfert / fusion / division de folios** (individuels, groupes, entreprises) ;
 *   - **encaissements multimoyens** (espèces, carte, Mobile Money, virement, chèque) +
 *     paiements partiels / acomptes / cautions / remboursements / différés ;
 *   - **facturation consolidée** (regroupe toutes les consommations du séjour, génère
 *     factures / avoirs / reçus) ;
 *   - **règles fiscales configurables** (taxe par hôtel, SYSCOHADA compatible) ;
 *   - **sync comptabilité** (génère les écritures comptables correspondantes) ;
 *   - **passerelles configurables** (Stripe, Flutterwave, Paystack, Mobile Money...).
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC billing.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { BillingError } from "./billing.error.js";
import type { BillingRepository } from "./billing.repository.js";
import type {
  AddFolioLineInput,
  BillingPaymentInput,
  ConsolidatedInvoice,
  CreateFolioInput,
  CreateGatewayInput,
  Folio,
  FolioLine,
  PaymentGateway,
} from "./billing.types.js";
import {
  validateAddFolioLine,
  validateBillingPayment,
  validateCreateFolio,
  validateCreateGateway,
} from "./billing.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface BillingActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class BillingService {
  constructor(
    private readonly repo: BillingRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---- Folios ----

  /** Crée un folio client (par séjour ou groupe). */
  async createFolio(hotelId: string, input: CreateFolioInput, actor: BillingActor): Promise<Folio> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateFolio(input);
    const folioRef = await this.repo.nextFolioRef();
    const folio = await this.repo.createFolio(hotelId, { ...v, folioRef });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.folio.create", entityType: "Folio", entityId: folio.id, after: { folioRef, guestId: v.guestId } });
    return folio;
  }

  /** Liste les folios (par groupe éventuel). */
  async listFolios(hotelId: string, groupRef: string | undefined, actor: BillingActor): Promise<Folio[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listFolios(hotelId, groupRef);
  }

  /** Ajoute une ligne de frais au folio (auto depuis POS/transport/etc.). */
  async addLine(hotelId: string, input: AddFolioLineInput, actor: BillingActor): Promise<FolioLine> {
    this.assertHotel(hotelId, actor);
    const v = validateAddFolioLine(input);
    const folio = await this.repo.getFolio(hotelId, v.folioId);
    if (!folio) throw new BillingError("Folio introuvable");
    const line = await this.repo.addLine(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.folio.line", entityType: "FolioLine", entityId: line.id, after: { folioId: v.folioId, chargeType: v.chargeType, amount: line.amount } });
    return line;
  }

  /** Transfère une ligne vers un autre folio (transfert de lignes). */
  async transferLine(hotelId: string, lineId: string, targetFolioId: string, actor: BillingActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const target = await this.repo.getFolio(hotelId, targetFolioId);
    if (!target) throw new BillingError("Folio cible introuvable");
    await this.repo.moveLine(lineId, targetFolioId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.folio.transfer", entityType: "FolioLine", entityId: lineId, after: { targetFolioId } });
  }

  /** Fusionne un folio source dans un folio cible (déplace toutes les lignes). */
  async mergeFolios(hotelId: string, sourceFolioId: string, targetFolioId: string, actor: BillingActor): Promise<Folio> {
    this.assertHotel(hotelId, actor);
    const source = await this.repo.getFolio(hotelId, sourceFolioId);
    const target = await this.repo.getFolio(hotelId, targetFolioId);
    if (!source || !target) throw new BillingError("Folio introuvable");
    const lines = await this.repo.getLines(hotelId, sourceFolioId);
    for (const l of lines) {
      if (!l.voided) await this.repo.moveLine(l.id, targetFolioId);
    }
    await this.repo.setFolioStatus(hotelId, sourceFolioId, "CLOSED");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.folio.merge", entityType: "Folio", entityId: sourceFolioId, after: { targetFolioId } });
    return target;
  }

  /** Annule une ligne de frais (void). */
  async voidLine(hotelId: string, lineId: string, actor: BillingActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.voidLine(hotelId, lineId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.folio.line_void", entityType: "FolioLine", entityId: lineId, after: { voided: true } });
  }

  // ---- Passerelles ----

  /** Configure une passerelle de paiement (Stripe, Flutterwave, etc.). */
  async createGateway(hotelId: string, input: CreateGatewayInput, actor: BillingActor): Promise<PaymentGateway> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateGateway(input);
    const gateway = await this.repo.createGateway(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.gateway.create", entityType: "PaymentGateway", entityId: gateway.id, after: { provider: v.provider } });
    return gateway;
  }

  async listGateways(hotelId: string, actor: BillingActor): Promise<PaymentGateway[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listGateways(hotelId);
  }

  // ---- Paiements ----

  /**
   * Enregistre un paiement (multimoyen). Gère partiel/acompte/caution/différé.
   */
  async pay(hotelId: string, input: BillingPaymentInput, actor: BillingActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    const v = validateBillingPayment(input);
    const folio = await this.repo.getFolio(hotelId, v.folioId);
    if (!folio) throw new BillingError("Folio introuvable");
    const paid = await this.repo.getFolioPaidTotal(hotelId, v.folioId);
    const { subtotal } = await this.repo.getFolioLinesTotal(hotelId, v.folioId);
    if (v.kind !== "DEPOSIT" && v.kind !== "CAUTION" && paid + v.amount > subtotal) {
      throw new BillingError("Paiement supérieur au solde du folio");
    }
    await this.repo.recordPayment(hotelId, v, actor.actorUserId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.payment", entityType: "Folio", entityId: v.folioId, after: { amount: v.amount, method: v.method, kind: v.kind } });
  }

  /** Remboursement (paiement négatif). */
  async refund(hotelId: string, folioId: string, amount: number, method: BillingPaymentInput["method"], actor: BillingActor, reference?: string): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.recordPayment(hotelId, { folioId, amount, method, kind: "PARTIAL", reference }, actor.actorUserId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.refund", entityType: "Folio", entityId: folioId, after: { amount, method } });
  }

  // ---- Facturation consolidée ----

  /**
   * Génère une facture consolidée regroupant toutes les consommations du séjour
   * (règles fiscales configurables via le taux de taxe).
   */
  async consolidate(hotelId: string, folioId: string, actor: BillingActor): Promise<ConsolidatedInvoice> {
    this.assertHotel(hotelId, actor);
    const folio = await this.repo.getFolio(hotelId, folioId);
    if (!folio) throw new BillingError("Folio introuvable");
    const { subtotal, taxAmount } = await this.repo.getFolioLinesTotal(hotelId, folioId);
    const number = await this.repo.nextInvoiceNumber();
    const inv = await this.repo.generateInvoice(folioId, { number, subtotal, taxAmount, total: subtotal + taxAmount });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "billing.invoice.consolidate", entityType: "Invoice", entityId: inv.id, after: { number, subtotal, taxAmount, total: subtotal + taxAmount } });
    return { invoiceId: inv.id, number, subtotal, taxAmount, total: subtotal + taxAmount };
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: BillingActor): void {
    if (actor.hotelId !== hotelId) throw new BillingError("Accès inter-hôtel refusé");
  }
}
