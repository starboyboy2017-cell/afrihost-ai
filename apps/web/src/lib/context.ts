/**
 * Résolution du contexte (AccessContext + TenantContext) depuis la session/JWT.
 *
 * À chaque requête API :
 *   1. on lit le cookie de session (`afrihost_session`, JWT signé) ;
 *   2. on résout l'utilisateur en base ;
 *   3. on charge ses membreships (org + hôtels + rôles) ;
 *   4. on calcule l'union des permissions sur l'hôtel actif ;
 *   5. on construit le AccessContext complet.
 *
 * Isolation multitenant : l'hôtel actif et les permissions sont strictement
 * dérivés des membreships de l'utilisateur (jamais de l'input client).
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { allPermissions } from "@afrihost/core";
import { verify, sessionCookieName, type SessionPayload } from "./auth";
import {
  AuthorizationService,
  type AccessContext,
  type TenantContext,
  assertTenant,
} from "@afrihost/core";

/** Instance partagée du service d'autorisation côté serveur. */
export const authorization = new AuthorizationService();

/** Résout le contexte d'accès d'une requête (depuis la session). */
export async function resolveAccessContext(
  _authorization: string | null,
): Promise<AccessContext | null> {
  void _authorization;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    if (!token) return null;
    const session = verify<SessionPayload>(token);
    if (!session?.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: {
        memberships: { include: { hotel: true, role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    });
    if (!user || !user.isActive) return null;

    // Super Admin plateforme : accès global, permissions totales.
    if (user.isSuperAdmin) {
      return {
        userId: user.id,
        organisationId: user.organisationId,
        hotelId: user.memberships[0]?.hotelId ?? "saas",
        roleCodes: ["PLATFORM_ADMIN"],
        permissions: allPermissions(),
        isPlatformAdmin: true,
      };
    }

    // Hôtel actif : le premier membership valide (isDefault desc, sinon premier).
    const active = [...user.memberships].sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault),
    )[0];
    if (!active) return null;

    const roleCodes = active.role ? [active.role.name] : [];
    const permissions = active.role?.rolePermissions
      .map((rp) => rp.permission.code as AccessContext["permissions"][number])
      ?? [];

    return {
      userId: user.id,
      organisationId: user.organisationId,
      hotelId: active.hotelId,
      roleCodes,
      permissions,
      isPlatformAdmin: false,
    };
  } catch {
    return null;
  }
}

/** Résout le contexte tenant (org + hôtel) pour une requête. */
export async function resolveTenant(access: AccessContext | null): Promise<TenantContext> {
  const ctx: TenantContext | null = access
    ? { organisationId: access.organisationId, hotelId: access.hotelId }
    : null;
  assertTenant(ctx);
  return ctx;
}
