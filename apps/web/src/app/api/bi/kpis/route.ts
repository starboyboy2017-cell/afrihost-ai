/**
 * Module 28 — BI : indicateurs clés (ADR, RevPAR, TRevPAR, occupation...).
 * GET /api/bi/kpis?from=&to= (bi.view)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const url = new URL(req.url);
    const kpis = await biService.kpis(ctx.hotelId, {
      from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ kpis });
  } catch (err) { return errorResponse(err); }
}
