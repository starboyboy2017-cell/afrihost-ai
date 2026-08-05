/**
 * Module 33 — Super Admin : sortie d'impersonation (retour au compte Super Admin).
 * POST /api/saasadmin/impersonation/:id/end
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: { impersonationId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.impersonation");
    await saasAdminService.endImpersonation(params.impersonationId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
