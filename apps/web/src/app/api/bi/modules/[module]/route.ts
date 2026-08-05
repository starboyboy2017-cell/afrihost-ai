/**
 * Module 28 — BI : statistiques d'un module (CRM, fidélité, POS, housekeeping...).
 * GET /api/bi/modules/:module (bi.view)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { module: string } }) {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const stats = await biService.moduleStats(ctx.hotelId, params.module, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ stats });
  } catch (err) { return errorResponse(err); }
}
