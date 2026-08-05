/**
 * Module 33 — Super Admin : impersonation sécurisée (Login As Hotel Admin).
 * GET  → historique des impersonations (saasadmin.impersonation)
 * POST → démarrer une impersonation (saasadmin.impersonation)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.impersonation");
    const impersonations = await saasAdminService.listImpersonations({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ impersonations });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.impersonation");
    const body = (await req.json()) as Record<string, unknown>;
    const impersonation = await saasAdminService.startImpersonation({
      targetUserId: body.targetUserId as string, hotelId: body.hotelId as string, reason: body.reason as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ impersonation }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
