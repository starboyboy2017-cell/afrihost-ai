/**
 * Module 20 — Folios : fusion.
 * POST /api/billing/folios/merge  body: { sourceFolioId, targetFolioId }  (billing.transfer)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("billing.transfer");
    const body = (await req.json()) as { sourceFolioId?: string; targetFolioId?: string };
    if (!body.sourceFolioId || !body.targetFolioId) return NextResponse.json({ error: "sourceFolioId et targetFolioId requis" }, { status: 400 });
    const folio = await billingService.mergeFolios(ctx.hotelId, body.sourceFolioId, body.targetFolioId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ folio });
  } catch (err) { return errorResponse(err); }
}
