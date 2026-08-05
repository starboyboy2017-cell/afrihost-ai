/**
 * Module 13 — POS : remboursement.
 * POST /api/pos/orders/:id/refund  body: { reason? }  (pos.sell)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { orderId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("pos.sell");
    const body = (await req.json()) as { reason?: string };
    const order = await posService.refund(ctx.hotelId, params.orderId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId }, body.reason);
    return NextResponse.json({ order });
  } catch (err) { return errorResponse(err); }
}
