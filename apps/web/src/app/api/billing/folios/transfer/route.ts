/**
 * Module 20 — Folios : transfert de ligne.
 * POST /api/billing/folios/transfer  body: { lineId, targetFolioId }  (billing.transfer)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("billing.transfer");
    const body = (await req.json()) as { lineId?: string; targetFolioId?: string };
    if (!body.lineId || !body.targetFolioId) return NextResponse.json({ error: "lineId et targetFolioId requis" }, { status: 400 });
    await billingService.transferLine(ctx.hotelId, body.lineId, body.targetFolioId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
