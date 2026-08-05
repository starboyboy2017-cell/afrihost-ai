/**
 * Moteur RBAC (multihôtel).
 *
 * Un utilisateur a un ou plusieurs rôles **par hôtel** (Membership). Pour décider si une
 * action est autorisée, on résout l'ensemble des permissions de l'utilisateur pour
 * **l'hôtel actif** de la session, puis on vérifie la permission demandée.
 *
 * Design :
 *  - `AccessContext` porte l'utilisateur, l'organisation, et l'hôtel actif.
 *  - `AuthorizationService.can(...)` = API unique de contrôle.
 *  - `requirePermission(...)` = garde réutilisable pour les route handlers.
 */

import type { PermissionCode } from "./permissions.js";

/** Contexte d'accès courant (résolu depuis la session/JWT + membership). */
export interface AccessContext {
  userId: string;
  organisationId: string;
  /** Hôtel actif de la session. */
  hotelId: string;
  /** Code(s) de rôle de l'utilisateur sur l'hôtel actif. */
  roleCodes: string[];
  /** Permissions effectives de l'utilisateur sur l'hôtel actif (union des rôles). */
  permissions: PermissionCode[];
  /** Vrai si l'utilisateur est un super admin plateforme (hors tenant). */
  isPlatformAdmin?: boolean;
}

export type PermissionResolver = (ctx: AccessContext) => PermissionCode[];

/**
 * Autorisation basée sur une table de résolution.
 * Par défaut, on passe les permissions déjà chargées dans le contexte. On peut injecter
 * un resolver pour charger dynamiquement depuis la BD (module IAM).
 */
export class AuthorizationService {
  constructor(private readonly resolver: PermissionResolver = (ctx) => ctx.permissions) {}

  /** Résout les permissions effectives de l'utilisateur. */
  permissions(ctx: AccessContext): PermissionCode[] {
    return this.resolver(ctx);
  }

  /** Vérifie si l'utilisateur possède TOUTES les permissions demandées. */
  can(ctx: AccessContext, ...required: PermissionCode[]): boolean {
    if (ctx.isPlatformAdmin) return true;
    const granted = new Set(this.permissions(ctx));
    return required.every((p) => granted.has(p));
  }

  /** Vérifie si l'utilisateur possède AU MOINS UNE des permissions demandées. */
  canAny(ctx: AccessContext, ...required: PermissionCode[]): boolean {
    if (ctx.isPlatformAdmin) return true;
    const granted = new Set(this.permissions(ctx));
    return required.some((p) => granted.has(p));
  }
}

/** Erreur d'autorisation. */
export class ForbiddenError extends Error {
  constructor(message = "Accès refusé : permission insuffisante") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentification requise") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Garde de route : exige une session + une permission. Lance si non autorisé. */
export function requirePermission(
  auth: AuthorizationService,
  ctx: AccessContext | null,
  permission: PermissionCode,
): void {
  if (!ctx) throw new UnauthorizedError();
  if (!auth.can(ctx, permission)) throw new ForbiddenError();
}

/** Instance partagée (resolver par défaut = permissions du contexte). */
export const authorizationService = new AuthorizationService();
