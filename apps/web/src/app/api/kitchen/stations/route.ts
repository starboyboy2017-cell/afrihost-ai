/**
 * Module 14 — Cuisine : postes.
 * GET  /api/kitchen/stations → liste (kitchen.view_orders)
 * POST /api/kitchen/stations → créer (kitchen.update_order)
 */
import { NextResponse } from "next/server";
import { kitchenService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("kitchen.view_orders");
    const stations = await kitchenService.listStations(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ stations });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("kitchen.update_order");
    const body = (await req.json()) as { name?: string };
    const station = await kitchenService.createStation(ctx.hotelId, { name: body.name ?? "" }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ station }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
