/**
 * Module 13 — POS : encaissement.
 * POST /api/pos/orders/:id/pay  body: { amount, method, reference? }  (pos.sell)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { orderId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("pos.sell");
    const body = (await req.json()) as { amount?: number; method?: string; reference?: string };
    if (body.amount === undefined || !body.method) return NextResponse.json({ error: "amount et method requis" }, { status: 400 });
    const order = await posService.pay(ctx.hotelId, { orderId: params.orderId, amount: body.amount, method: body.method as never, reference: body.reference }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ order });
  } catch (err) { return errorResponse(err); }
}
