/**
 * Module 15 — Caisse : rapport financier d'une session.
 * GET /api/cash/sessions/:id/report (caisse.view)
 */
import { NextResponse } from "next/server";
import { cashService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { sessionId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("caisse.view");
    const report = await cashService.buildReport(ctx.hotelId, params.sessionId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ report });
  } catch (err) { return errorResponse(err); }
}
