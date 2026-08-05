/**
 * Sous-module 33.1 — Bootstrap & Initialisation du SaaS : service métier.
 *
 * Mécanisme sécurisé de création du **premier** compte SUPER_ADMIN, exécuté
 * UNE SEULE fois au premier déploiement via un script/commande protégée par une
 * `bootstrapKey` (variable d'environnement / fichier sécurisé).
 *
 * Règles de sécurité :
 *   - création unique : `bootstrapFirstSuperAdmin` échoue si un Super Admin existe ;
 *   - aucune inscription publique ne peut créer un Super Admin (isSuperAdmin
 *     uniquement via ce mécanisme, hors de l'inscription) ;
 *   - seul un Super Admin existant crée/modifie/suspend les autres Super Admins
 *     (géré dans le Module 33 via saasadmin) ;
 *   - le premier mot de passe doit être changé à la première connexion
 *     (mustChangePassword) ;
 *   - le 2FA doit être activé avant tout accès aux fonctionnalités
 *     d'administration (le login exige le code si 2FA activé) ;
 *   - toutes les actions sont journalisées dans l'audit log.
 */
import { type AuditTrail, type EventBus, DomainEvents } from "@afrihost/core";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { BootstrapError } from "./bootstrap.error.js";
import type { BootstrapRepository } from "./bootstrap.repository.js";
import type {
  BootstrapFirstSuperAdminInput,
  ChangeSuperAdminPasswordInput,
  Enable2FAResult,
  Enable2FAInput,
  SuperAdminAccount,
  SuperAdminLoginInput,
} from "./bootstrap.types.js";
import {
  validateBootstrapFirstSuperAdmin,
  validateChangeSuperAdminPassword,
  validateEnable2FA,
  validateSuperAdminLogin,
} from "./bootstrap.validation.js";

/** Contexte d'acteur (audit + isolation). */
export interface BootstrapActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class BootstrapService {
  constructor(
    private readonly repo: BootstrapRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
    /** Clé de bootstrap secrète (fournie par l'environnement). */
    private readonly bootstrapKey: string,
  ) {}

  // ---------------------------------------------------------------------------
  // État d'initialisation
  // ---------------------------------------------------------------------------

  async isInitialized(actor: BootstrapActor): Promise<boolean> {
    return this.repo.hasSuperAdmin();
  }

  // ---------------------------------------------------------------------------
  // Création du premier Super Admin (une seule fois)
  // ---------------------------------------------------------------------------

  async bootstrapFirstSuperAdmin(input: BootstrapFirstSuperAdminInput, actor: BootstrapActor): Promise<SuperAdminAccount> {
    const v = validateBootstrapFirstSuperAdmin(input);
    // 1. Vérification de la clé de bootstrap (empêche la création publique).
    if (!this.secureCompare(v.bootstrapKey, this.bootstrapKey)) {
      throw new BootstrapError("Clé de bootstrap invalide");
    }
    // 2. Création unique : impossible s'il en existe déjà un.
    if (await this.repo.hasSuperAdmin()) {
      throw new BootstrapError("Le SaaS est déjà initialisé");
    }
    // 3. Création du compte (mot de passe hashé, mustChangePassword=true).
    const account = await this.repo.createFirstSuperAdmin({
      email: v.email.toLowerCase(),
      passwordHash: this.hash(v.password),
      firstName: v.firstName,
      lastName: v.lastName,
    });
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: actor.actorUserId, action: "bootstrap.super_admin.create", entityType: "User", entityId: account.id, after: { email: v.email, mustChangePassword: true } });
    await this.bus.publish({ name: DomainEvents.bootstrapSuperAdminCreated, hotelId: actor.hotelId, organisationId: actor.organisationId, data: { superAdminId: account.id } });
    return account;
  }

  // ---------------------------------------------------------------------------
  // Connexion d'un Super Admin (avec 2FA si activé)
  // ---------------------------------------------------------------------------

  async login(input: SuperAdminLoginInput, actor: BootstrapActor): Promise<SuperAdminAccount> {
    const v = validateSuperAdminLogin(input);
    const user = await this.repo.findByEmail(v.email.toLowerCase());
    if (!user) throw new BootstrapError("Identifiants invalides");
    if (!user.passwordHash || !this.secureCompare(user.passwordHash, this.hash(v.password))) {
      throw new BootstrapError("Identifiants invalides");
    }
    // 2FA : requis avant tout accès administration.
    if (user.twoFactorEnabled) {
      if (!v.otp) throw new BootstrapError("Code 2FA requis");
      if (!this.verifyTotp(v.otp, user.twoFactorSecret ?? "")) throw new BootstrapError("Code 2FA invalide");
    }
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: user.id, action: "bootstrap.super_admin.login", entityType: "User", entityId: user.id, after: { twoFactor: user.twoFactorEnabled } });
    return { id: user.id, email: user.email, mustChangePassword: user.mustChangePassword, twoFactorEnabled: user.twoFactorEnabled };
  }

  /** Vérifie qu'un compte Super Admin doit changer son mot de passe / activer le 2FA. */
  async securityStatus(superAdminId: string, actor: BootstrapActor): Promise<{ mustChangePassword: boolean; twoFactorEnabled: boolean }> {
    const user = await this.repo.findById(superAdminId);
    if (!user) throw new BootstrapError("Super Admin introuvable");
    return { mustChangePassword: user.mustChangePassword, twoFactorEnabled: user.twoFactorEnabled };
  }

  // ---------------------------------------------------------------------------
  // Changement de mot de passe (première connexion)
  // ---------------------------------------------------------------------------

  async changePassword(superAdminId: string, input: ChangeSuperAdminPasswordInput, actor: BootstrapActor): Promise<void> {
    const v = validateChangeSuperAdminPassword(input);
    const user = await this.repo.findById(superAdminId);
    if (!user) throw new BootstrapError("Super Admin introuvable");
    const current = await this.repo.findByEmail(user.email);
    if (!current?.passwordHash || !this.secureCompare(current.passwordHash, this.hash(v.currentPassword))) {
      throw new BootstrapError("Mot de passe actuel invalide");
    }
    await this.repo.setPassword(superAdminId, this.hash(v.newPassword));
    await this.repo.clearMustChangePassword(superAdminId);
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: superAdminId, action: "bootstrap.super_admin.change_password", entityType: "User", entityId: superAdminId });
  }

  // ---------------------------------------------------------------------------
  // Activation du 2FA (requise avant accès administration)
  // ---------------------------------------------------------------------------

  /** Génère un secret TOTP pour le Super Admin. */
  async generate2FASecret(superAdminId: string, actor: BootstrapActor): Promise<Enable2FAResult> {
    const user = await this.repo.findById(superAdminId);
    if (!user) throw new BootstrapError("Super Admin introuvable");
    const secret = this.generateTotpSecret();
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: superAdminId, action: "bootstrap.super_admin.2fa_generate", entityType: "User", entityId: superAdminId });
    return { secret };
  }

  /** Active le 2FA après confirmation du code. */
  async enable2FA(superAdminId: string, input: Enable2FAInput, actor: BootstrapActor): Promise<void> {
    const v = validateEnable2FA(input);
    if (!this.verifyTotp(v.code, v.secret)) throw new BootstrapError("Code 2FA invalide");
    await this.repo.enable2FA(superAdminId, v.secret);
    await this.repo.set2FA(superAdminId, true);
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: superAdminId, action: "bootstrap.super_admin.2fa_enable", entityType: "User", entityId: superAdminId });
  }

  async disable2FA(superAdminId: string, actor: BootstrapActor): Promise<void> {
    await this.repo.set2FA(superAdminId, false);
    await this.audit.write({ organisationId: actor.organisationId, hotelId: actor.hotelId, actorUserId: superAdminId, action: "bootstrap.super_admin.2fa_disable", entityType: "User", entityId: superAdminId });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private hash(value: string): string {
    return createHash("sha256").update(`afrihost-superadmin:${value}`).digest("hex");
  }

  private secureCompare(a: string, b: string): boolean {
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    if (ha.length !== hb.length) return false;
    let diff = 0;
    for (let i = 0; i < ha.length; i++) diff |= ha[i]! ^ hb[i]!;
    return diff === 0;
  }

  private generateTotpSecret(): string {
    return randomBytes(20).toString("base64url");
  }

  /** Vérifie un code TOTP (RFC 6238, 30s fenêtre, ±1). */
  private verifyTotp(code: string, secret: string): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    if (!secret) return false;
    const counter = Math.floor(Date.now() / 30000);
    for (let offset = -1; offset <= 1; offset++) {
      const expected = this.totp(secret, counter + offset);
      if (this.secureCompare(expected, code)) return true;
    }
    return false;
  }

  private totp(secret: string, counter: number): string {
    const key = Buffer.from(secret, "base64url");
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = createHmac("sha1", key).update(buf).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    return value.toString().padStart(6, "0");
  }
}
