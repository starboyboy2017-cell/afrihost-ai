/**
 * Résolution du contexte (AccessContext + TenantContext) depuis la session/JWT.
 *
 * En production : le token Supabase Auth est décodé (claims organisation_id + hôtels),
 * et les membreships servent à résoudre l'hôtel actif et les rôles de l'utilisateur.
 * Ici on expose la fonction à brancher sur l'API réelle d'authentification.
 */

import {
  AuthorizationService,
  type AccessContext,
  type TenantContext,
  assertTenant,
} from "@afrihost/core";

/**
 * Résout le contexte d'accès d'une requête.
 * @returns AccessContext si authentifié, sinon null.
 */
export async function resolveAccessContext(
  _authorization: string | null,
): Promise<AccessContext | null> {
  // TODO(Module 3 — IAM) : décoder le JWT Supabase, charger les membreships et
  // construire le AccessContext complet (userId, organisationId, hotelId, roles, permissions).
  void _authorization;
  return null;
}

/**
 * Résout le contexte tenant (org + hôtel) pour une requête.
 * Lève si absent/invalide (isolation multitenant).
 */
export async function resolveTenant(
  access: AccessContext | null,
): Promise<TenantContext> {
  const ctx: TenantContext | null = access
    ? { organisationId: access.organisationId, hotelId: access.hotelId }
    : null;
  assertTenant(ctx);
  return ctx;
}

/** Instance partagée du service d'autorisation côté serveur. */
export const authorization = new AuthorizationService();
