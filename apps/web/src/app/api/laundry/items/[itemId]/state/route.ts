/**
 * Module 11 — Blanchisserie : changement d'état d'une pièce.
 * POST /api/laundry/items/:id/state  body: { state, roomId? }  (laundry.manage)
 */
import { NextResponse } from "next/server";
import { laundryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { itemId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("laundry.manage");
    const body = (await req.json()) as { state?: string; roomId?: string };
    if (!body.state) return NextResponse.json({ error: "state requis" }, { status: 400 });
    const item = await laundryService.changeState(ctx.hotelId, params.itemId, body.state as never, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    }, body.roomId);
    return NextResponse.json({ item });
  } catch (err) { return errorResponse(err); }
}
