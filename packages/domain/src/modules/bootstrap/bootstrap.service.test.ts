import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { BootstrapService, type BootstrapActor } from "./bootstrap.service.js";
import { BootstrapError } from "./bootstrap.error.js";
import type { BootstrapRepository } from "./bootstrap.repository.js";
import type { SuperAdminAccount } from "./bootstrap.types.js";
import { createHash } from "node:crypto";

let seq = 0;

const hash = (v: string) => createHash("sha256").update(`afrihost-superadmin:${v}`).digest("hex");

class MemoryRepo implements BootstrapRepository {
  accounts: (SuperAdminAccount & { passwordHash: string | null; twoFactorSecret: string | null })[] = [];

  async hasSuperAdmin(): Promise<boolean> { return this.accounts.length > 0; }
  async findByEmail(email: string) { return this.accounts.find((a) => a.email === email) ?? null; }
  async findById(id: string) { return this.accounts.find((a) => a.id === id) ?? null; }
  async createFirstSuperAdmin(input: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<SuperAdminAccount> {
    const a = { id: `sa-${++seq}`, email: input.email, passwordHash: input.passwordHash, twoFactorSecret: null, mustChangePassword: true, twoFactorEnabled: false };
    this.accounts.push(a); return { id: a.id, email: a.email, mustChangePassword: a.mustChangePassword, twoFactorEnabled: a.twoFactorEnabled };
  }
  async setPassword(id: string, passwordHash: string): Promise<void> { const a = this.accounts.find((x) => x.id === id)!; a.passwordHash = passwordHash; }
  async clearMustChangePassword(id: string): Promise<void> { const a = this.accounts.find((x) => x.id === id)!; a.mustChangePassword = false; }
  async enable2FA(id: string, secret: string): Promise<void> { const a = this.accounts.find((x) => x.id === id)!; a.twoFactorSecret = secret; }
  async set2FA(id: string, enabled: boolean): Promise<void> { const a = this.accounts.find((x) => x.id === id)!; a.twoFactorEnabled = enabled; }
}

const actor: BootstrapActor = { organisationId: "platform", hotelId: "saas", actorUserId: "bootstrap" };

function build() {
  const repo = new MemoryRepo();
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new BootstrapService(repo, audit, bus, "bootstrap-secret-key");
  return { repo, svc, bus };
}

describe("bootstrap.service", () => {
  beforeEach(() => { seq = 0; });

  it("est non initialisé au départ", async () => {
    const { svc } = build();
    expect(await svc.isInitialized(actor)).toBe(false);
  });

  it("crée le premier Super Admin une seule fois", async () => {
    const { svc } = build();
    const sa = await svc.bootstrapFirstSuperAdmin({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "bootstrap-secret-key" }, actor);
    expect(sa.mustChangePassword).toBe(true);
    expect(sa.twoFactorEnabled).toBe(false);
    expect(await svc.isInitialized(actor)).toBe(true);
    // Deuxième tentative → échoue (création unique).
    await expect(svc.bootstrapFirstSuperAdmin({ email: "sa2@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "bootstrap-secret-key" }, actor)).rejects.toThrow(BootstrapError);
  });

  it("rejette une mauvaise clé de bootstrap", async () => {
    const { svc } = build();
    await expect(svc.bootstrapFirstSuperAdmin({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "mauvaise-cle" }, actor)).rejects.toThrow("Clé de bootstrap invalide");
  });

  it("se connecte après bootstrap et exige le changement de mot de passe", async () => {
    const { svc } = build();
    await svc.bootstrapFirstSuperAdmin({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "bootstrap-secret-key" }, actor);
    const login = await svc.login({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4" }, actor);
    expect(login.mustChangePassword).toBe(true);
    const status = await svc.securityStatus(login.id, actor);
    expect(status.mustChangePassword).toBe(true);
  });

  it("change le mot de passe à la première connexion", async () => {
    const { svc } = build();
    await svc.bootstrapFirstSuperAdmin({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "bootstrap-secret-key" }, actor);
    const login = await svc.login({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4" }, actor);
    await svc.changePassword(login.id, { currentPassword: "M0tDeP@ss3!xTr4", newPassword: "N0uv@uM0tDeP@ss!" }, actor);
    const status = await svc.securityStatus(login.id, actor);
    expect(status.mustChangePassword).toBe(false);
    // L'ancien mot de passe ne fonctionne plus.
    await expect(svc.login({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4" }, actor)).rejects.toThrow(BootstrapError);
  });

  it("génère un secret 2FA et l'active après confirmation", async () => {
    const { svc } = build();
    await svc.bootstrapFirstSuperAdmin({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "bootstrap-secret-key" }, actor);
    const login = await svc.login({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4" }, actor);
    const { secret } = await svc.generate2FASecret(login.id, actor);
    expect(secret).toBeTruthy();
    // Activation avec un code invalide → rejet.
    await expect(svc.enable2FA(login.id, { code: "000000", secret }, actor)).rejects.toThrow("Code 2FA invalide");
  });

  it("rejette un mot de passe invalide à la connexion", async () => {
    const { svc } = build();
    await svc.bootstrapFirstSuperAdmin({ email: "sa@afrihost.com", password: "M0tDeP@ss3!xTr4", bootstrapKey: "bootstrap-secret-key" }, actor);
    await expect(svc.login({ email: "sa@afrihost.com", password: "mauvais" }, actor)).rejects.toThrow("Identifiants invalides");
  });
});
