/**
 * Module 13 — POS : annulation d'une commande ouverte.
 * POST /api/pos/orders/:id/void  body: { reason? }  (pos.sell)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { orderId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("pos.sell");
    const body = (await req.json()) as { reason?: string };
    const order = await posService.cancel(ctx.hotelId, params.orderId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId }, body.reason);
    return NextResponse.json({ order });
  } catch (err) { return errorResponse(err); }
}
