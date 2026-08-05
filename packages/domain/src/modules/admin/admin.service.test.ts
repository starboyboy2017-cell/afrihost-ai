import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { AdminService, type AdminActor } from "./admin.service.js";
import { AdminError } from "./admin.error.js";
import type { AdminRepository } from "./admin.repository.js";
import type { AdminConfig, ListConfigFilter, SetConfigInput } from "./admin.types.js";

let seq = 0;

class MemoryRepo implements AdminRepository {
  configs: AdminConfig[] = [];
  async setConfig(input: SetConfigInput): Promise<AdminConfig> {
    const existing = this.configs.find((c) => c.scope === input.scope && c.hotelId === (input.scope === "HOTEL" ? input.hotelId : null) && c.category === input.category && c.key === input.key);
    if (existing) { existing.value = input.value; existing.isActive = true; return existing; }
    const c: AdminConfig = { id: `ac-${++seq}`, scope: input.scope ?? "HOTEL", hotelId: input.scope === "HOTEL" ? input.hotelId ?? null : null, category: input.category, key: input.key, value: input.value, isActive: true };
    this.configs.push(c); return c;
  }
  async listConfigs(filter: ListConfigFilter): Promise<AdminConfig[]> {
    return this.configs.filter((c) => c.scope === filter.scope && c.hotelId === filter.hotelId && (filter.category ? c.category === filter.category : true));
  }
  async getConfig(scope: "SAAS" | "HOTEL", hotelId: string | null, category: string, key: string): Promise<AdminConfig | null> {
    return this.configs.find((c) => c.scope === scope && c.hotelId === hotelId && c.category === category && c.key === key) ?? null;
  }
  async setConfigActive(id: string, isActive: boolean): Promise<void> { const c = this.configs.find((x) => x.id === id)!; c.isActive = isActive; }
  async deleteConfig(id: string): Promise<void> { this.configs = this.configs.filter((x) => x.id !== id); }
}

const actorH1: AdminActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new AdminService(repo, audit, bus);
  return { repo, svc };
}

describe("admin.service", () => {
  beforeEach(() => { seq = 0; });

  it("définit une configuration hôtel", async () => {
    const { repo, svc } = build();
    const c = await svc.setConfig("h1", { category: "tax", key: "vatRate", value: 0.18 }, actorH1);
    expect(c.scope).toBe("HOTEL");
    expect(repo.configs.length).toBe(1);
  });

  it("définit une configuration SaaS globale", async () => {
    const { repo, svc } = build();
    const c = await svc.setConfig("h1", { category: "saas", key: "maxHotels", value: 50, scope: "SAAS" }, actorH1);
    expect(c.scope).toBe("SAAS");
    expect(repo.configs.length).toBe(1);
  });

  it("rejette une config hôtel pour un autre hôtel", async () => {
    const { svc } = build();
    await expect(svc.setConfig("h1", { category: "tax", key: "x", value: 1, hotelId: "h2" }, actorH1)).rejects.toThrow(AdminError);
  });

  it("résout la valeur effective (hôtel prioritaire sur SaaS)", async () => {
    const { svc } = build();
    await svc.setConfig("h1", { category: "tax", key: "vat", value: 0.18, scope: "SAAS" }, actorH1);
    await svc.setConfig("h1", { category: "tax", key: "vat", value: 0.20 }, actorH1);
    const eff = await svc.getEffective("h1", "tax", "vat", actorH1);
    expect(eff).toBe(0.20);
  });

  it("retourne le SaaS si pas d'override hôtel", async () => {
    const { svc } = build();
    await svc.setConfig("h1", { category: "tax", key: "vat", value: 0.18, scope: "SAAS" }, actorH1);
    const eff = await svc.getEffective("h1", "tax", "vat", actorH1);
    expect(eff).toBe(0.18);
  });

  it("liste les configs par catégorie", async () => {
    const { svc } = build();
    await svc.setConfig("h1", { category: "tax", key: "vat", value: 0.18 }, actorH1);
    await svc.setConfig("h1", { category: "billing", key: "prefix", value: "INV-" }, actorH1);
    const tax = await svc.listConfigs("h1", { category: "tax", scope: "HOTEL", hotelId: "h1" }, actorH1);
    expect(tax.length).toBe(1);
    expect(tax[0]!.key).toBe("vat");
  });

  it("fournit les catalogues de référence", () => {
    const { svc } = build();
    expect(svc.currencies().length).toBeGreaterThan(10);
    expect(svc.languages().length).toBeGreaterThan(5);
    expect(svc.timezones().length).toBeGreaterThan(5);
  });
});
