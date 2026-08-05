import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { AccountingService, type AccountingActor } from "./accounting.service.js";
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

class MemoryRepo implements AccountingRepository {
  accounts = new Map<string, Account>();
  periods: AccountingPeriod[] = [];
  journals = new Map<string, AccountingJournal>();
  costCenters: CostCenter[] = [];
  entries = new Map<string, { id: string; status: JournalEntryStatus; lines: { accountId: string; debit: number; credit: number }[] }>();
  balances = new Map<string, { debit: number; credit: number }>();
  seq = 0;

  async createAccount(hotelId: string, input: CreateAccountInput): Promise<Account> {
    const a: Account = { id: `acc-${++this.seq}`, hotelId, code: input.code, name: input.name, type: input.type, nature: input.nature, isActive: true };
    this.accounts.set(a.id, a);
    return a;
  }
  async listAccounts(hotelId: string): Promise<Account[]> { return [...this.accounts.values()].filter((a) => a.hotelId === hotelId); }
  async accountExists(hotelId: string, id: string): Promise<boolean> { const a = this.accounts.get(id); return !!a && a.hotelId === hotelId; }
  async createPeriod(hotelId: string, input: CreatePeriodInput): Promise<AccountingPeriod> {
    const p: AccountingPeriod = { id: `per-${++this.seq}`, hotelId, label: input.label, startDate: new Date(input.startDate), endDate: new Date(input.endDate), isClosed: false };
    this.periods.push(p);
    return p;
  }
  async listPeriods(hotelId: string): Promise<AccountingPeriod[]> { return this.periods.filter((p) => p.hotelId === hotelId); }
  async createJournal(hotelId: string, name: string, type: AccountingJournal["type"]): Promise<AccountingJournal> {
    const j: AccountingJournal = { id: `j-${++this.seq}`, hotelId, name, type, isActive: true };
    this.journals.set(j.id, j);
    return j;
  }
  async listJournals(hotelId: string): Promise<AccountingJournal[]> { return [...this.journals.values()].filter((j) => j.hotelId === hotelId); }
  async journalExists(hotelId: string, id: string): Promise<boolean> { const j = this.journals.get(id); return !!j && j.hotelId === hotelId; }
  async createCostCenter(hotelId: string, name: string, code: string): Promise<CostCenter> {
    const c: CostCenter = { id: `cc-${++this.seq}`, hotelId, name, code, isActive: true };
    this.costCenters.push(c);
    return c;
  }
  async listCostCenters(hotelId: string): Promise<CostCenter[]> { return this.costCenters.filter((c) => c.hotelId === hotelId); }
  async createJournalEntry(hotelId: string, input: CreateJournalEntryInput & { status: JournalEntryStatus; createdBy?: string }): Promise<{ id: string }> {
    const id = `entry-${++this.seq}`;
    this.entries.set(id, { id, status: input.status, lines: input.lines.map((l) => ({ accountId: l.accountId, debit: l.debit ?? 0, credit: l.credit ?? 0 })) });
    return { id };
  }
  async setJournalEntryStatus(hotelId: string, entryId: string, status: JournalEntryStatus): Promise<void> {
    const e = this.entries.get(entryId);
    if (e) e.status = status;
  }
  async getTrialBalance(hotelId: string, periodId: string): Promise<TrialBalanceLine[]> {
    const out: TrialBalanceLine[] = [];
    for (const [id, e] of this.entries) {
      if (e.status !== "POSTED") continue;
      for (const l of e.lines) {
        const a = this.accounts.get(l.accountId)!;
        let line = out.find((x) => x.code === a.code);
        if (!line) { line = { code: a.code, name: a.name, debit: 0, credit: 0 }; out.push(line); }
        line.debit += l.debit;
        line.credit += l.credit;
      }
    }
    return out;
  }
  async getLedger(hotelId: string, accountId: string): Promise<{ entryDate: Date; reference: string; label: string; debit: number; credit: number }[]> { return []; }
  async getAccountBalance(hotelId: string, accountId: string, periodId: string): Promise<{ debit: number; credit: number }> { return this.balances.get(accountId) ?? { debit: 0, credit: 0 }; }
  async createBankReconciliation(hotelId: string, input: BankReconciliationInput & { ledgerBalance: number; difference: number }): Promise<{ id: string }> { return { id: `br-${++this.seq}` }; }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new AccountingService(repo, audit, bus);
  const actor: AccountingActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

describe("Module 19 — Comptabilité", () => {
  it("crée un compte du plan comptable (SYSCOHADA)", async () => {
    const { service, actor } = setup();
    const a = await service.createAccount("h1", { code: "601100", name: "Achats matières premières", type: "EXPENSE", nature: "DEBIT" }, actor);
    expect(a.code).toBe("601100");
    expect(a.type).toBe("EXPENSE");
  });

  it("rejette un code de compte non numérique", async () => {
    const { service, actor } = setup();
    await expect(service.createAccount("h1", { code: "ABC", name: "X", type: "OTHER", nature: "DEBIT" }, actor)).rejects.toThrow(/Code numérique/);
  });

  it("crée une période comptable", async () => {
    const { service, actor } = setup();
    const p = await service.createPeriod("h1", { label: "Janvier 2026", startDate: "2026-01-01", endDate: "2026-01-31" }, actor);
    expect(p.label).toBe("Janvier 2026");
  });

  it("crée les journaux (ventes, achats, banque, caisse, OD)", async () => {
    const { service, actor } = setup();
    await service.createJournal("h1", "Ventes", "SALES", actor);
    await service.createJournal("h1", "Banque", "BANK", actor);
    const journals = await service.listJournals("h1", actor);
    expect(journals.length).toBe(2);
  });

  it("crée une écriture équilibrée (débit = crédit)", async () => {
    const { service, actor } = setup();
    const caisse = await service.createAccount("h1", { code: "521000", name: "Banques", type: "ASSET", nature: "DEBIT" }, actor);
    const produits = await service.createAccount("h1", { code: "701100", name: "Ventes", type: "REVENUE", nature: "CREDIT" }, actor);
    const journal = await service.createJournal("h1", "Ventes", "SALES", actor);
    const entry = await service.createEntry("h1", {
      journalId: journal.id, entryDate: "2026-01-10", reference: "FAC-001", label: "Vente chambre",
      lines: [{ accountId: caisse.id, debit: 50000 }, { accountId: produits.id, credit: 50000 }],
    }, actor);
    expect(entry.id).toBeTruthy();
  });

  it("rejette une écriture non équilibrée", async () => {
    const { service, actor } = setup();
    const caisse = await service.createAccount("h1", { code: "521000", name: "Banques", type: "ASSET", nature: "DEBIT" }, actor);
    const produits = await service.createAccount("h1", { code: "701100", name: "Ventes", type: "REVENUE", nature: "CREDIT" }, actor);
    const journal = await service.createJournal("h1", "Ventes", "SALES", actor);
    await expect(service.createEntry("h1", {
      journalId: journal.id, entryDate: "2026-01-10", reference: "FAC-002", label: "Déséquilibré",
      lines: [{ accountId: caisse.id, debit: 50000 }, { accountId: produits.id, credit: 40000 }],
    }, actor)).rejects.toThrow(/non équilibrée/);
  });

  it("crée une écriture d'ajustement", async () => {
    const { service, actor } = setup();
    const caisse = await service.createAccount("h1", { code: "521000", name: "Banques", type: "ASSET", nature: "DEBIT" }, actor);
    const produits = await service.createAccount("h1", { code: "701100", name: "Ventes", type: "REVENUE", nature: "CREDIT" }, actor);
    const journal = await service.createJournal("h1", "OD", "GENERAL", actor);
    const entry = await service.createAdjustment("h1", {
      journalId: journal.id, entryDate: "2026-01-15", reference: "ADJ-001", label: "Régularisation",
      lines: [{ accountId: caisse.id, debit: 1000 }, { accountId: produits.id, credit: 1000 }],
    }, actor);
    expect(entry.id).toBeTruthy();
  });

  it("génère la balance (totaux débits/crédits)", async () => {
    const { repo, service, actor } = setup();
    const caisse = await service.createAccount("h1", { code: "521000", name: "Banques", type: "ASSET", nature: "DEBIT" }, actor);
    const produits = await service.createAccount("h1", { code: "701100", name: "Ventes", type: "REVENUE", nature: "CREDIT" }, actor);
    const journal = await service.createJournal("h1", "Ventes", "SALES", actor);
    await service.createEntry("h1", { journalId: journal.id, entryDate: "2026-01-10", reference: "F1", label: "V1", lines: [{ accountId: caisse.id, debit: 50000 }, { accountId: produits.id, credit: 50000 }] }, actor);
    const balance = await service.trialBalance("h1", "", actor);
    expect(balance.some((l) => l.code === "521000" && l.debit === 50000)).toBe(true);
    expect(balance.some((l) => l.code === "701100" && l.credit === 50000)).toBe(true);
    void repo;
  });

  it("annule une écriture (VOID)", async () => {
    const { repo, service, actor } = setup();
    const caisse = await service.createAccount("h1", { code: "521000", name: "Banques", type: "ASSET", nature: "DEBIT" }, actor);
    const produits = await service.createAccount("h1", { code: "701100", name: "Ventes", type: "REVENUE", nature: "CREDIT" }, actor);
    const journal = await service.createJournal("h1", "Ventes", "SALES", actor);
    const entry = await service.createEntry("h1", { journalId: journal.id, entryDate: "2026-01-10", reference: "F2", label: "V2", lines: [{ accountId: caisse.id, debit: 1000 }, { accountId: produits.id, credit: 1000 }] }, actor);
    await service.voidEntry("h1", entry.id, actor);
    expect(repo.entries.get(entry.id)!.status).toBe("VOID");
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: AccountingActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createAccount("h1", { code: "601100", name: "X", type: "OTHER", nature: "DEBIT" }, other)).rejects.toThrow(AccountingError);
  });

  it("journalise les écritures comptables", async () => {
    const { writer, service, actor } = setup();
    const caisse = await service.createAccount("h1", { code: "521000", name: "Banques", type: "ASSET", nature: "DEBIT" }, actor);
    const produits = await service.createAccount("h1", { code: "701100", name: "Ventes", type: "REVENUE", nature: "CREDIT" }, actor);
    const journal = await service.createJournal("h1", "Ventes", "SALES", actor);
    await service.createEntry("h1", { journalId: journal.id, entryDate: "2026-01-10", reference: "F3", label: "V3", lines: [{ accountId: caisse.id, debit: 1000 }, { accountId: produits.id, credit: 1000 }] }, actor);
    expect(writer.entries.some((e) => e.action === "accounting.entry.create")).toBe(true);
  });
});
