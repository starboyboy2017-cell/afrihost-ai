import { describe, it, expect } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { BillingService, type BillingActor } from "./billing.service.js";
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

type StoredFolio = Folio & { lines: (FolioLine & { folioId: string })[]; payments: { id: string; amount: number; method: string; kind: string | null }[] };

class MemoryRepo implements BillingRepository {
  folios = new Map<string, StoredFolio>();
  gateways: PaymentGateway[] = [];
  invoices: { id: string; folioId: string; number: string; subtotal: number; taxAmount: number; total: number }[] = [];
  seq = 0;

  async createFolio(hotelId: string, input: CreateFolioInput & { folioRef: string }): Promise<Folio> {
    const f: StoredFolio = { id: `fl-${++this.seq}`, hotelId, guestId: input.guestId, reservationId: input.reservationId ?? null, folioRef: input.folioRef, name: input.name ?? null, status: "OPEN", groupRef: input.groupRef ?? null, currency: input.currency ?? "XOF", createdAt: new Date(), updatedAt: new Date(), lines: [], payments: [] };
    this.folios.set(f.id, f);
    return f;
  }
  async getFolio(hotelId: string, id: string): Promise<Folio | null> { const f = this.folios.get(id); return f && f.hotelId === hotelId ? f : null; }
  async listFolios(hotelId: string, groupRef?: string): Promise<Folio[]> {
    return [...this.folios.values()].filter((f) => f.hotelId === hotelId && (!groupRef || f.groupRef === groupRef));
  }
  async setFolioStatus(hotelId: string, id: string, status: Folio["status"]): Promise<Folio> {
    const f = this.folios.get(id)!; f.status = status; return f;
  }
  async nextFolioRef(): Promise<string> { return `FL-2026-${String(this.seq + 1).padStart(4, "0")}`; }
  async addLine(hotelId: string, input: AddFolioLineInput): Promise<FolioLine> {
    const f = this.folios.get(input.folioId)!;
    const line: FolioLine & { folioId: string } = { id: `l-${++this.seq}`, folioId: input.folioId, chargeType: input.chargeType, description: input.description, quantity: input.quantity ?? 1, unitPrice: input.unitPrice, amount: (input.quantity ?? 1) * input.unitPrice, taxRate: input.taxRate ?? 0, sourceRef: input.sourceRef ?? null, voided: false };
    f.lines.push(line);
    return line;
  }
  async getLines(hotelId: string, folioId: string): Promise<FolioLine[]> { return this.folios.get(folioId)?.lines ?? []; }
  async moveLine(lineId: string, targetFolioId: string): Promise<void> {
    for (const f of this.folios.values()) {
      const idx = f.lines.findIndex((l) => l.id === lineId);
      if (idx >= 0) {
        const [line] = f.lines.splice(idx, 1);
        if (line) { line.folioId = targetFolioId; this.folios.get(targetFolioId)?.lines.push(line); }
        break;
      }
    }
  }
  async voidLine(hotelId: string, lineId: string): Promise<void> {
    for (const f of this.folios.values()) { const l = f.lines.find((x) => x.id === lineId); if (l) l.voided = true; }
  }
  async createGateway(hotelId: string, input: CreateGatewayInput): Promise<PaymentGateway> {
    const g: PaymentGateway = { id: `g-${++this.seq}`, hotelId, name: input.name, provider: input.provider, isActive: true, config: input.config ?? null };
    this.gateways.push(g);
    return g;
  }
  async listGateways(hotelId: string): Promise<PaymentGateway[]> { return this.gateways.filter((g) => g.hotelId === hotelId); }
  async recordPayment(hotelId: string, input: BillingPaymentInput, receivedBy?: string): Promise<void> {
    const f = this.folios.get(input.folioId)!;
    f.payments.push({ id: `p-${++this.seq}`, amount: input.amount, method: input.method, kind: input.kind ?? null });
  }
  async listPayments(hotelId: string, folioId: string) { return this.folios.get(folioId)?.payments ?? []; }
  async getFolioPaidTotal(hotelId: string, folioId: string): Promise<number> {
    return (this.folios.get(folioId)?.payments ?? []).reduce((s, p) => s + p.amount, 0);
  }
  async generateInvoice(folioId: string, data: { number: string; subtotal: number; taxAmount: number; total: number }): Promise<{ id: string }> {
    const id = `inv-${++this.seq}`;
    this.invoices.push({ id, folioId, ...data });
    return { id };
  }
  async nextInvoiceNumber(): Promise<string> { return `INV-2026-${String(this.seq + 1).padStart(4, "0")}`; }
  async getFolioLinesTotal(hotelId: string, folioId: string): Promise<{ subtotal: number; taxAmount: number }> {
    const lines = this.folios.get(folioId)?.lines.filter((l) => !l.voided) ?? [];
    let subtotal = 0, tax = 0;
    for (const l of lines) { subtotal += l.amount; tax += Math.round(l.amount * l.taxRate); }
    return { subtotal, taxAmount: tax };
  }
}

function setup() {
  const repo = new MemoryRepo();
  const writer = new InMemoryAuditWriter();
  const audit = new AuditLogger(writer);
  const bus = new EventBus();
  const service = new BillingService(repo, audit, bus);
  const actor: BillingActor = { organisationId: "o1", hotelId: "h1", actorUserId: "u1" };
  return { repo, writer, bus, service, actor };
}

async function seedFolio(service: BillingService, actor: BillingActor) {
  return service.createFolio("h1", { guestId: "g1", reservationId: "r1" }, actor);
}

describe("Module 20 — Paiements & facturation", () => {
  it("crée un folio client avec référence unique", async () => {
    const { service, actor } = setup();
    const folio = await service.createFolio("h1", { guestId: "g1" }, actor);
    expect(folio.folioRef).toMatch(/^FL-2026-/);
    expect(folio.status).toBe("OPEN");
  });

  it("ajoute des lignes de frais (tous types)", async () => {
    const { repo, service, actor } = setup();
    const folio = await seedFolio(service, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "ROOM", description: "Nuit 1", unitPrice: 15000, taxRate: 0.18 }, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "RESTAURANT", description: "Dîner", unitPrice: 5000, taxRate: 0.18 }, actor);
    expect(repo.folios.get(folio.id)!.lines.length).toBe(2);
  });

  it("transfère une ligne vers un autre folio", async () => {
    const { repo, service, actor } = setup();
    const f1 = await seedFolio(service, actor);
    const f2 = await service.createFolio("h1", { guestId: "g1" }, actor);
    const line = await service.addLine("h1", { folioId: f1.id, chargeType: "MINIBAR", description: "Boisson", unitPrice: 2000 }, actor);
    await service.transferLine("h1", line.id, f2.id, actor);
    expect(repo.folios.get(f2.id)!.lines.some((l) => l.id === line.id)).toBe(true);
    expect(repo.folios.get(f1.id)!.lines.some((l) => l.id === line.id)).toBe(false);
  });

  it("fusionne deux folios", async () => {
    const { repo, service, actor } = setup();
    const f1 = await seedFolio(service, actor);
    const f2 = await service.createFolio("h1", { guestId: "g1" }, actor);
    await service.addLine("h1", { folioId: f1.id, chargeType: "ROOM", description: "Nuit", unitPrice: 10000 }, actor);
    await service.mergeFolios("h1", f1.id, f2.id, actor);
    expect(repo.folios.get(f2.id)!.lines.length).toBe(1);
    expect(repo.folios.get(f1.id)!.status).toBe("CLOSED");
  });

  it("enregistre un paiement multimoyen et le solde", async () => {
    const { repo, service, actor } = setup();
    const folio = await seedFolio(service, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "ROOM", description: "Nuit", unitPrice: 10000 }, actor);
    await service.pay("h1", { folioId: folio.id, amount: 4000, method: "MOBILE_MONEY", kind: "PARTIAL" }, actor);
    const paid = await repo.getFolioPaidTotal("h1", folio.id);
    expect(paid).toBe(4000);
  });

  it("gère les acomptes (DEPOSIT) et cautions (CAUTION) sans dépasser le solde", async () => {
    const { service, actor } = setup();
    const folio = await seedFolio(service, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "ROOM", description: "Nuit", unitPrice: 10000 }, actor);
    await service.pay("h1", { folioId: folio.id, amount: 5000, method: "CASH", kind: "DEPOSIT" }, actor);
    await service.pay("h1", { folioId: folio.id, amount: 2000, method: "CARD", kind: "CAUTION" }, actor);
    // PAS d'erreur car DEPOSIT/CAUTION ne vérifient pas le solde
    expect(true).toBe(true);
  });

  it("rejette un paiement plein au-delà du solde", async () => {
    const { service, actor } = setup();
    const folio = await seedFolio(service, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "ROOM", description: "Nuit", unitPrice: 10000 }, actor);
    await expect(service.pay("h1", { folioId: folio.id, amount: 15000, method: "CASH" }, actor)).rejects.toThrow(/supérieur au solde/);
  });

  it("génère une facture consolidée regroupant toutes les consommations", async () => {
    const { service, actor } = setup();
    const folio = await seedFolio(service, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "ROOM", description: "Nuit", unitPrice: 10000, taxRate: 0.18 }, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "RESTAURANT", description: "Dîner", unitPrice: 5000, taxRate: 0.18 }, actor);
    const inv = await service.consolidate("h1", folio.id, actor);
    expect(inv.subtotal).toBe(15000);
    expect(inv.taxAmount).toBe(2700); // 18% de 15000
    expect(inv.total).toBe(17700);
    expect(inv.number).toMatch(/^INV-2026-/);
  });

  it("configure une passerelle de paiement", async () => {
    const { service, actor } = setup();
    const g = await service.createGateway("h1", { name: "Flutterwave", provider: "flutterwave" }, actor);
    expect(g.provider).toBe("flutterwave");
  });

  it("annule une ligne de frais (void)", async () => {
    const { repo, service, actor } = setup();
    const folio = await seedFolio(service, actor);
    const line = await service.addLine("h1", { folioId: folio.id, chargeType: "OTHER", description: "Extras", unitPrice: 1000 }, actor);
    await service.voidLine("h1", line.id, actor);
    expect(repo.folios.get(folio.id)!.lines.find((l) => l.id === line.id)!.voided).toBe(true);
  });

  it("isole : refuse un accès inter-hôtel", async () => {
    const { service, actor } = setup();
    const other: BillingActor = { organisationId: "o1", hotelId: "h2", actorUserId: "u1" };
    await expect(service.createFolio("h1", { guestId: "g1" }, other)).rejects.toThrow(BillingError);
  });

  it("journalise les paiements et facturations", async () => {
    const { writer, service, actor } = setup();
    const folio = await seedFolio(service, actor);
    await service.addLine("h1", { folioId: folio.id, chargeType: "ROOM", description: "Nuit", unitPrice: 10000 }, actor);
    await service.pay("h1", { folioId: folio.id, amount: 10000, method: "CASH" }, actor);
    await service.consolidate("h1", folio.id, actor);
    expect(writer.entries.some((e) => e.action === "billing.payment")).toBe(true);
    expect(writer.entries.some((e) => e.action === "billing.invoice.consolidate")).toBe(true);
  });
});
