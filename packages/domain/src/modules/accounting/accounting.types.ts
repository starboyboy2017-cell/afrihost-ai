/**
 * Module 19 — Comptabilité générale : types du domaine.
 */

/** Nature d'un compte. */
export type AccountNature = "DEBIT" | "CREDIT";

/** Type de compte. */
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "OTHER";

/** Type de journal. */
export type AccountingJournalType = "SALES" | "PURCHASES" | "BANK" | "CASH" | "GENERAL";

/** Statut d'une écriture. */
export type JournalEntryStatus = "DRAFT" | "POSTED" | "VOID";

/** Période comptable. */
export interface AccountingPeriod {
  id: string;
  hotelId: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
}

/** Compte du plan comptable. */
export interface Account {
  id: string;
  hotelId: string;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  isActive: boolean;
}

/** Centre de coûts. */
export interface CostCenter {
  id: string;
  hotelId: string;
  name: string;
  code: string;
  isActive: boolean;
}

/** Journal comptable. */
export interface AccountingJournal {
  id: string;
  hotelId: string;
  name: string;
  type: AccountingJournalType;
  isActive: boolean;
}

/** Ligne d'écriture. */
export interface JournalEntryLineInput {
  accountId: string;
  costCenterId?: string | null;
  debit?: number;
  credit?: number;
}

/** Saisie d'une écriture comptable. */
export interface CreateJournalEntryInput {
  journalId: string;
  periodId?: string | null;
  entryDate: Date | string;
  reference: string;
  label: string;
  lines: JournalEntryLineInput[];
}

/** Saisie d'un compte. */
export interface CreateAccountInput {
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
}

/** Saisie d'une période. */
export interface CreatePeriodInput {
  label: string;
  startDate: Date | string;
  endDate: Date | string;
}

/** Saisie d'un rapprochement bancaire. */
export interface BankReconciliationInput {
  bankAccount: string;
  statementDate: Date | string;
  bankBalance: number;
}

/** Résultat balance (somme des soldes). */
export interface TrialBalanceLine {
  code: string;
  name: string;
  debit: number;
  credit: number;
}
