/**
 * Sous-module 33.1 — Bootstrap : port de persistance.
 */
import type { SuperAdminAccount } from "./bootstrap.types.js";

export interface BootstrapRepository {
  /** Vrai si au moins un compte SUPER_ADMIN existe déjà. */
  hasSuperAdmin(): Promise<boolean>;
  /** Compte Super Admin par email. */
  findByEmail(email: string): Promise<SuperAdminAccount & { passwordHash: string | null; twoFactorSecret: string | null } | null>;
  /** Compte Super Admin par id. */
  findById(id: string): Promise<SuperAdminAccount | null>;
  /** Crée le premier Super Admin (mot de passe hashé, isSuperAdmin, mustChangePassword). */
  createFirstSuperAdmin(input: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<SuperAdminAccount>;
  /** Change le mot de passe et lève le flag mustChangePassword. */
  setPassword(id: string, passwordHash: string): Promise<void>;
  clearMustChangePassword(id: string): Promise<void>;
  /** Active le 2FA. */
  enable2FA(id: string, secret: string): Promise<void>;
  /** Stocke le flag 2FA. */
  set2FA(id: string, enabled: boolean): Promise<void>;
}
