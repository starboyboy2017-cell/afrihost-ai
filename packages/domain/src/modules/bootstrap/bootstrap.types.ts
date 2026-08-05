/**
 * Sous-module 33.1 — Bootstrap & Initialisation du SaaS : types du domaine.
 *
 * Mécanisme sécurisé de création du premier compte SUPER_ADMIN lors du premier
 * déploiement. Créé UNE SEULE fois via un script/commande sécurisée (bootstrapKey).
 */

/** État d'initialisation du SaaS. */
export interface BootstrapState {
  initialized: boolean;
  superAdminEmail?: string | null;
  initializedAt?: Date | null;
}

/** Compte Super Admin (vue de sécurité). */
export interface SuperAdminAccount {
  id: string;
  email: string;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
}

/** Saisie de bootstrap du premier Super Admin. */
export interface BootstrapFirstSuperAdminInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  /** Clé de bootstrap secrète (fichier/var d'env) — empêche toute création publique. */
  bootstrapKey: string;
}

/** Connexion d'un Super Admin. */
export interface SuperAdminLoginInput {
  email: string;
  password: string;
  /** Code 2FA (requis si activé). */
  otp?: string | null;
}

/** Changement de mot de passe forcé. */
export interface ChangeSuperAdminPasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Activation 2FA (TOTP). */
export interface Enable2FAResult {
  secret: string;
  qrDataUrl?: string | null;
}

export interface Enable2FAInput {
  /** Code 2FA de confirmation. */
  code: string;
  secret: string;
}
