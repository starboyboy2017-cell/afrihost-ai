/**
 * Module 15 — Caisse : mouvement de caisse.
 * POST /api/cash/sessions/:id/movement  body: { type, method, amount, reference?, note? }  (caisse.manage)
 */
import { NextResponse } from "next/server";
import { cashService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { sessionId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("caisse.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const movement = await cashService.addMovement(ctx.hotelId, {
      sessionId: params.sessionId, type: body.type as never, method: body.method as never, amount: body.amount as number,
      reference: body.reference as string | undefined, note: body.note as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
