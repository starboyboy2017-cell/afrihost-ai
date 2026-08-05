/**
 * Module 14 — Cuisine : ordres de préparation.
 * GET  /api/kitchen/orders?stationId&status&priority → liste (kitchen.view_orders)
 * POST /api/kitchen/orders                           → réception d'une commande POS (kitchen.update_order)
 */
import { NextResponse } from "next/server";
import { kitchenService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("kitchen.view_orders");
    const url = new URL(req.url);
    const result = await kitchenService.listOrders(ctx.hotelId, {
      stationId: url.searchParams.get("stationId") ?? undefined,
      status: (url.searchParams.get("status") ?? undefined) as never,
      priority: (url.searchParams.get("priority") ?? undefined) as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("kitchen.update_order");
    const body = (await req.json()) as Record<string, unknown>;
    const order = await kitchenService.receiveOrder(ctx.hotelId, {
      posOrderId: body.posOrderId as string,
      stationId: body.stationId as string,
      priority: body.priority as never,
      notes: body.notes as string | undefined,
      posPointId: body.posPointId as string | undefined,
      reservationId: body.reservationId as string | undefined,
      roomId: body.roomId as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
