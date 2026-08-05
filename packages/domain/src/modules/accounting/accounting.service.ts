/**
 * Module 19 — Comptabilité générale : service métier.
 *
 * Fonctionnalités :
 *   - **plan comptable configurable par hôtel** (compatibilité SYSCOHADA révisé /
 *     OHADA / UEMOA par configuration — les règles ne sont pas codées en dur) ;
 *   - **journaux** (ventes, achats, banque, caisse, OD) ;
 *   - **écritures automatiques** (création + validation d'équilibre débit = crédit) ;
 *   - **périodes comptables** (ouverture/fermeture) ;
 *   - **rapprochements bancaires** ;
 *   - **comptes clients/fournisseurs** (via plan comptable), **centres de coûts** ;
 *   - **écritures d'ajustement**, **balance**, **grand livre**.
 *
 * Isolation multihôtel : rejet des accès inter-hôtels. RBAC accounting.*.
 * Chaque mutation est journalisée (audit).
 */

import { type AuditTrail, type EventBus } from "@afrihost/core";
import { AccountingError } from "./accounting.error.js";
import type { AccountingRepository } from "./accounting.repository.js";
import type {
  Account,
  AccountingJournal,
  AccountingPeriod,
  BankReconciliationInput,
  CostCenter,
  CreateAccountInput,
  CreateJournalEntryInput,
  CreatePeriodInput,
  JournalEntryStatus,
  TrialBalanceLine,
} from "./accounting.types.js";
import {
  validateBankReconciliation,
  validateCreateAccount,
  validateCreateJournalEntry,
  validateCreatePeriod,
} from "./accounting.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface AccountingActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class AccountingService {
  constructor(
    private readonly repo: AccountingRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---- Plan comptable (configurable) ----

  /** Crée un compte (règles de nature SYSCOHADA : classes 1/4 crédit, 2/5 débit, etc.). */
  async createAccount(hotelId: string, input: CreateAccountInput, actor: AccountingActor): Promise<Account> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateAccount(input);
    const account = await this.repo.createAccount(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.account.create", entityType: "Account", entityId: account.id, after: { code: account.code, name: account.name } });
    return account;
  }

  /** Liste le plan comptable. */
  async listAccounts(hotelId: string, actor: AccountingActor): Promise<Account[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listAccounts(hotelId);
  }

  // ---- Périodes ----

  async createPeriod(hotelId: string, input: CreatePeriodInput, actor: AccountingActor): Promise<AccountingPeriod> {
    this.assertHotel(hotelId, actor);
    const v = validateCreatePeriod(input);
    const period = await this.repo.createPeriod(hotelId, v);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.period.create", entityType: "AccountingPeriod", entityId: period.id, after: { label: period.label } });
    return period;
  }

  async listPeriods(hotelId: string, actor: AccountingActor): Promise<AccountingPeriod[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listPeriods(hotelId);
  }

  // ---- Journaux & centres de coûts ----

  async createJournal(hotelId: string, name: string, type: AccountingJournal["type"], actor: AccountingActor): Promise<AccountingJournal> {
    this.assertHotel(hotelId, actor);
    const journal = await this.repo.createJournal(hotelId, name, type);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.journal.create", entityType: "AccountingJournal", entityId: journal.id, after: { name, type } });
    return journal;
  }

  async listJournals(hotelId: string, actor: AccountingActor): Promise<AccountingJournal[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listJournals(hotelId);
  }

  async createCostCenter(hotelId: string, name: string, code: string, actor: AccountingActor): Promise<CostCenter> {
    this.assertHotel(hotelId, actor);
    const cc = await this.repo.createCostCenter(hotelId, name, code);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.cost_center.create", entityType: "CostCenter", entityId: cc.id, after: { name, code } });
    return cc;
  }

  async listCostCenters(hotelId: string, actor: AccountingActor): Promise<CostCenter[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.listCostCenters(hotelId);
  }

  // ---- Écritures comptables ----

  /**
   * Crée une écriture comptable (auto depuis POS/paiements/stock/achats).
   * Règle : **l'écriture doit être équilibrée** (somme débits = somme crédits).
   */
  async createEntry(hotelId: string, input: CreateJournalEntryInput, actor: AccountingActor): Promise<{ id: string }> {
    this.assertHotel(hotelId, actor);
    const v = validateCreateJournalEntry(input);
    if (!(await this.repo.journalExists(hotelId, v.journalId))) throw new AccountingError("Journal introuvable");
    for (const l of v.lines) {
      if (!(await this.repo.accountExists(hotelId, l.accountId))) throw new AccountingError("Compte introuvable");
    }

    // Vérifier l'équilibre débit = crédit (règle comptable universelle)
    const totalDebit = v.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = v.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (totalDebit !== totalCredit) {
      throw new AccountingError(`Écriture non équilibrée : débit ${totalDebit} ≠ crédit ${totalCredit}`);
    }

    const entry = await this.repo.createJournalEntry(hotelId, { ...v, status: "POSTED", createdBy: actor.actorUserId });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.entry.create", entityType: "JournalEntry", entityId: entry.id, after: { reference: v.reference, label: v.label, lines: v.lines.length } });
    return entry;
  }

  /** Crée une écriture d'ajustement (ex: correction, régularisation). */
  async createAdjustment(hotelId: string, input: CreateJournalEntryInput, actor: AccountingActor): Promise<{ id: string }> {
    const v = { ...input, label: `Ajustement - ${input.label}` };
    return this.createEntry(hotelId, v, actor);
  }

  /** Annule une écriture (status VOID). */
  async voidEntry(hotelId: string, entryId: string, actor: AccountingActor): Promise<void> {
    this.assertHotel(hotelId, actor);
    await this.repo.setJournalEntryStatus(hotelId, entryId, "VOID");
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.entry.void", entityType: "JournalEntry", entityId: entryId, after: { status: "VOID" } });
  }

  // ---- États comptables ----

  /** Balance (totaux débits/crédits par compte sur une période). */
  async trialBalance(hotelId: string, periodId: string, actor: AccountingActor): Promise<TrialBalanceLine[]> {
    this.assertHotel(hotelId, actor);
    return this.repo.getTrialBalance(hotelId, periodId);
  }

  /** Grand livre d'un compte. */
  async ledger(hotelId: string, accountId: string, actor: AccountingActor) {
    this.assertHotel(hotelId, actor);
    return this.repo.getLedger(hotelId, accountId);
  }

  // ---- Rapprochement bancaire ----

  /** Rapprochement bancaire : compare solde comptable et solde bancaire. */
  async reconcile(hotelId: string, input: BankReconciliationInput, actor: AccountingActor): Promise<{ id: string; difference: number }> {
    this.assertHotel(hotelId, actor);
    const v = validateBankReconciliation(input);
    // solde comptable = somme des comptes banque de l'hôtel (simplifié : on prend un compte 511/521)
    const bankAccounts = (await this.repo.listAccounts(hotelId)).filter((a) => a.code.startsWith("52"));
    let ledgerBalance = 0;
    for (const a of bankAccounts) {
      const bal = await this.repo.getAccountBalance(hotelId, a.id, "");
      ledgerBalance += bal.debit - bal.credit;
    }
    const difference = ledgerBalance - v.bankBalance;
    const result = await this.repo.createBankReconciliation(hotelId, { ...v, ledgerBalance, difference });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "accounting.reconcile", entityType: "BankReconciliation", entityId: result.id, after: { ledgerBalance, bankBalance: v.bankBalance, difference } });
    return { id: result.id, difference };
  }

  /** Isolation multitenant. */
  private assertHotel(hotelId: string, actor: AccountingActor): void {
    if (actor.hotelId !== hotelId) throw new AccountingError("Accès inter-hôtel refusé");
  }
}
