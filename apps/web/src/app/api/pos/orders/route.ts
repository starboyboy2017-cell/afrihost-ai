/**
 * Module 13 — POS : commandes.
 * GET  /api/pos/orders?status → liste (pos.view)
 * POST /api/pos/orders        → créer (pos.sell)
 * GET  /api/pos/orders/revenue → chiffre d'affaires (pos.view)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("pos.view");
    const url = new URL(req.url);
    if (url.pathname.endsWith("/revenue")) {
      const revenue = await posService.getRevenue(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
      return NextResponse.json({ revenue });
    }
    const orders = await posService.listOrders(ctx.hotelId, (url.searchParams.get("status") ?? undefined) as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ orders });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("pos.sell");
    const body = (await req.json()) as Record<string, unknown>;
    const order = await posService.createOrder(ctx.hotelId, {
      posPointId: body.posPointId as string,
      reservationId: body.reservationId as string | undefined,
      roomId: body.roomId as string | undefined,
      lines: body.lines as never[],
      discountAmount: body.discountAmount as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
