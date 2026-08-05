/**
 * Module 19 — Comptabilité : adapter Prisma.
 */
import type {
  AccountingRepository,
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
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaAccountingRepository implements AccountingRepository {
  async createAccount(hotelId: string, input: CreateAccountInput): Promise<Account> {
    const a = await prisma.account.create({ data: { hotelId, code: input.code, name: input.name, type: input.type, nature: input.nature } });
    return { id: a.id, hotelId: a.hotelId, code: a.code, name: a.name, type: a.type as Account["type"], nature: a.nature as Account["nature"], isActive: a.isActive };
  }
  async listAccounts(hotelId: string): Promise<Account[]> {
    const rows = await prisma.account.findMany({ where: { hotelId }, orderBy: { code: "asc" } });
    return rows.map((a) => ({ id: a.id, hotelId: a.hotelId, code: a.code, name: a.name, type: a.type as Account["type"], nature: a.nature as Account["nature"], isActive: a.isActive }));
  }
  async accountExists(hotelId: string, id: string): Promise<boolean> {
    const a = await prisma.account.findFirst({ where: { id, hotelId } });
    return a !== null;
  }
  async createPeriod(hotelId: string, input: CreatePeriodInput): Promise<AccountingPeriod> {
    const p = await prisma.accountingPeriod.create({ data: { hotelId, label: input.label, startDate: new Date(input.startDate), endDate: new Date(input.endDate) } });
    return { id: p.id, hotelId: p.hotelId, label: p.label, startDate: p.startDate, endDate: p.endDate, isClosed: p.isClosed };
  }
  async listPeriods(hotelId: string): Promise<AccountingPeriod[]> {
    const rows = await prisma.accountingPeriod.findMany({ where: { hotelId }, orderBy: { startDate: "desc" } });
    return rows.map((p) => ({ id: p.id, hotelId: p.hotelId, label: p.label, startDate: p.startDate, endDate: p.endDate, isClosed: p.isClosed }));
  }
  async createJournal(hotelId: string, name: string, type: AccountingJournal["type"]): Promise<AccountingJournal> {
    const j = await prisma.accountingJournal.create({ data: { hotelId, name, type } });
    return { id: j.id, hotelId: j.hotelId, name: j.name, type: j.type as AccountingJournal["type"], isActive: j.isActive };
  }
  async listJournals(hotelId: string): Promise<AccountingJournal[]> {
    const rows = await prisma.accountingJournal.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((j) => ({ id: j.id, hotelId: j.hotelId, name: j.name, type: j.type as AccountingJournal["type"], isActive: j.isActive }));
  }
  async journalExists(hotelId: string, id: string): Promise<boolean> {
    const j = await prisma.accountingJournal.findFirst({ where: { id, hotelId } });
    return j !== null;
  }
  async createCostCenter(hotelId: string, name: string, code: string): Promise<CostCenter> {
    const c = await prisma.costCenter.create({ data: { hotelId, name, code } });
    return { id: c.id, hotelId: c.hotelId, name: c.name, code: c.code, isActive: c.isActive };
  }
  async listCostCenters(hotelId: string): Promise<CostCenter[]> {
    const rows = await prisma.costCenter.findMany({ where: { hotelId }, orderBy: { name: "asc" } });
    return rows.map((c) => ({ id: c.id, hotelId: c.hotelId, name: c.name, code: c.code, isActive: c.isActive }));
  }
  async createJournalEntry(hotelId: string, input: CreateJournalEntryInput & { status: JournalEntryStatus; createdBy?: string }): Promise<{ id: string }> {
    const e = await prisma.journalEntry.create({
      data: { hotelId, journalId: input.journalId, periodId: input.periodId ?? null, entryDate: new Date(input.entryDate), reference: input.reference, label: input.label, status: input.status, postedAt: input.status === "POSTED" ? new Date() : null, createdBy: input.createdBy ?? null },
    });
    await prisma.journalEntryLine.createMany({
      data: input.lines.map((l) => ({ entryId: e.id, accountId: l.accountId, costCenterId: l.costCenterId ?? null, debit: l.debit ?? 0, credit: l.credit ?? 0 })),
    });
    return { id: e.id };
  }
  async setJournalEntryStatus(hotelId: string, entryId: string, status: JournalEntryStatus): Promise<void> {
    await prisma.journalEntry.update({ where: { id: entryId, hotelId }, data: { status } });
  }
  async getTrialBalance(hotelId: string, periodId: string): Promise<TrialBalanceLine[]> {
    const lines = await prisma.journalEntryLine.findMany({
      where: { entry: { hotelId, periodId: periodId || undefined, status: "POSTED" } },
      include: { account: true },
    });
    const map = new Map<string, TrialBalanceLine>();
    for (const l of lines) {
      const e = map.get(l.account.code) ?? { code: l.account.code, name: l.account.name, debit: 0, credit: 0 };
      e.debit += l.debit; e.credit += l.credit;
      map.set(l.account.code, e);
    }
    return [...map.values()];
  }
  async getLedger(hotelId: string, accountId: string): Promise<{ entryDate: Date; reference: string; label: string; debit: number; credit: number }[]> {
    const lines = await prisma.journalEntryLine.findMany({
      where: { accountId, entry: { hotelId } },
      include: { entry: { select: { entryDate: true, reference: true, label: true } } },
      orderBy: { entry: { entryDate: "asc" } },
    });
    return lines.map((l) => ({ entryDate: l.entry.entryDate, reference: l.entry.reference, label: l.entry.label, debit: l.debit, credit: l.credit }));
  }
  async getAccountBalance(hotelId: string, accountId: string, periodId: string): Promise<{ debit: number; credit: number }> {
    const bal = await prisma.accountBalance.findUnique({ where: { accountId_periodId: { accountId, periodId } } });
    return { debit: bal?.debit ?? 0, credit: bal?.credit ?? 0 };
  }
  async createBankReconciliation(hotelId: string, input: BankReconciliationInput & { ledgerBalance: number; difference: number }): Promise<{ id: string }> {
    const br = await prisma.bankReconciliation.create({ data: { hotelId, bankAccount: input.bankAccount, statementDate: new Date(input.statementDate), ledgerBalance: input.ledgerBalance, bankBalance: input.bankBalance, difference: input.difference } });
    return { id: br.id };
  }
}
