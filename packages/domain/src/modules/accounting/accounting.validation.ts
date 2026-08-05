/**
 * Module 19 — Comptabilité : validation (zod).
 */

import { z } from "zod";
import type { BankReconciliationInput, CreateAccountInput, CreateJournalEntryInput, CreatePeriodInput } from "./accounting.types.js";

const natureEnum = ["DEBIT", "CREDIT"] as const;
const typeEnum = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "OTHER"] as const;
const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createAccountSchema = z.object({
  code: z.string().trim().min(1, "Code requis").regex(/^\d{2,6}$/, "Code numérique (ex: 601100)"),
  name: z.string().trim().min(1, "Nom requis"),
  type: z.enum(typeEnum),
  nature: z.enum(natureEnum),
}).strict();

export const createPeriodSchema = z.object({
  label: z.string().trim().min(1, "Libellé requis"),
  startDate: dateCoerce,
  endDate: dateCoerce,
}).strict()
  .refine((d) => d.endDate.getTime() > d.startDate.getTime(), { message: "endDate doit être après startDate" });

export const createJournalEntrySchema = z.object({
  journalId: z.string().min(1),
  periodId: z.string().min(1).optional().nullable(),
  entryDate: dateCoerce,
  reference: z.string().trim().min(1, "Référence requise"),
  label: z.string().trim().min(1, "Libellé requis"),
  lines: z.array(z.object({
    accountId: z.string().min(1),
    costCenterId: z.string().min(1).optional().nullable(),
    debit: z.number().int().min(0).default(0),
    credit: z.number().int().min(0).default(0),
  })).min(2, "Une écriture doit avoir au moins 2 lignes"),
}).strict();

export const bankReconciliationSchema = z.object({
  bankAccount: z.string().trim().min(1),
  statementDate: dateCoerce,
  bankBalance: z.number().int(),
}).strict();

export function validateCreateAccount(input: CreateAccountInput): CreateAccountInput {
  return createAccountSchema.parse(input) as CreateAccountInput;
}
export function validateCreatePeriod(input: CreatePeriodInput): CreatePeriodInput {
  return createPeriodSchema.parse(input) as CreatePeriodInput;
}
export function validateCreateJournalEntry(input: CreateJournalEntryInput): CreateJournalEntryInput {
  return createJournalEntrySchema.parse(input) as CreateJournalEntryInput;
}
export function validateBankReconciliation(input: BankReconciliationInput): BankReconciliationInput {
  return bankReconciliationSchema.parse(input) as BankReconciliationInput;
}
