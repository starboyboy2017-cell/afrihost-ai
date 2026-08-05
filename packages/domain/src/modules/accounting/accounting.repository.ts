/**
 * Module 19 — Comptabilité : port de persistance.
 */
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

export interface AccountingRepository {
  // Plan comptable
  createAccount(hotelId: string, input: CreateAccountInput): Promise<Account>;
  listAccounts(hotelId: string): Promise<Account[]>;
  accountExists(hotelId: string, accountId: string): Promise<boolean>;

  // Périodes
  createPeriod(hotelId: string, input: CreatePeriodInput): Promise<AccountingPeriod>;
  listPeriods(hotelId: string): Promise<AccountingPeriod[]>;

  // Journaux
  createJournal(hotelId: string, name: string, type: AccountingJournal["type"]): Promise<AccountingJournal>;
  listJournals(hotelId: string): Promise<AccountingJournal[]>;
  journalExists(hotelId: string, journalId: string): Promise<boolean>;

  // Centres de coûts
  createCostCenter(hotelId: string, name: string, code: string): Promise<CostCenter>;
  listCostCenters(hotelId: string): Promise<CostCenter[]>;

  // Écritures
  createJournalEntry(hotelId: string, input: CreateJournalEntryInput & { status: JournalEntryStatus; createdBy?: string }): Promise<{ id: string }>;
  setJournalEntryStatus(hotelId: string, entryId: string, status: JournalEntryStatus): Promise<void>;

  // États
  getTrialBalance(hotelId: string, periodId: string): Promise<TrialBalanceLine[]>;
  getLedger(hotelId: string, accountId: string): Promise<{ entryDate: Date; reference: string; label: string; debit: number; credit: number }[]>;
  getAccountBalance(hotelId: string, accountId: string, periodId: string): Promise<{ debit: number; credit: number }>;

  // Rapprochement bancaire
  createBankReconciliation(hotelId: string, input: BankReconciliationInput & { ledgerBalance: number; difference: number }): Promise<{ id: string }>;
}
