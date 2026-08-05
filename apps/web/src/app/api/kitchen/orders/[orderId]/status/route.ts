/**
 * Module 14 — Cuisine : cycle de vie d'un ordre.
 * POST /api/kitchen/orders/:id/status  body: { status }  (kitchen.update_order)
 *   status: NEW | PREPARING | READY | SERVED | MODIFIED | CANCELLED
 */
import { NextResponse } from "next/server";
import { kitchenService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { orderId: string } };
const STATUSES = ["NEW", "PREPARING", "READY", "SERVED", "MODIFIED", "CANCELLED"] as const;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("kitchen.update_order");
    const body = (await req.json()) as { status?: string; reason?: string };
    if (!body.status || !(STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: "status invalide" }, { status: 400 });
    const actor = { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId };
    let order;
    if (body.status === "CANCELLED") order = await kitchenService.cancel(ctx.hotelId, params.orderId, actor, body.reason);
    else if (body.status === "MODIFIED") order = await kitchenService.markModified(ctx.hotelId, params.orderId, actor, body.reason);
    else order = await kitchenService.transition(ctx.hotelId, params.orderId, body.status as never, actor);
    return NextResponse.json({ order });
  } catch (err) { return errorResponse(err); }
}
