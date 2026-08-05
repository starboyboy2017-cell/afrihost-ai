/**
 * Module 15 — Caisse : clôture + réconciliation.
 * POST /api/cash/sessions/:id/close  body: { countedAmount, note? }  (caisse.close)
 */
import { NextResponse } from "next/server";
import { cashService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { sessionId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("caisse.close");
    const body = (await req.json()) as { countedAmount?: number; note?: string };
    if (body.countedAmount === undefined) return NextResponse.json({ error: "countedAmount requis" }, { status: 400 });
    const session = await cashService.closeSession(ctx.hotelId, { sessionId: params.sessionId, countedAmount: body.countedAmount, note: body.note }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ session });
  } catch (err) { return errorResponse(err); }
}
