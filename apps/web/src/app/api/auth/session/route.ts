/**
 * Authentification — session courante.
 * GET /api/auth/session
 * Retourne le contexte d'accès si connecté, sinon { authenticated: false }.
 */
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    context: {
      userId: ctx.userId,
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      roleCodes: ctx.roleCodes,
      permissions: ctx.permissions.length,
      isPlatformAdmin: ctx.isPlatformAdmin ?? false,
    },
  });
}
