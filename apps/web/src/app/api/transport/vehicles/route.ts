/**
 * Module 12 — Transport : véhicules.
 * GET  /api/transport/vehicles → liste (transport.view)
 * POST /api/transport/vehicles → créer (transport.update)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("transport.view");
    const vehicles = await transportService.listVehicles(ctx.hotelId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ vehicles });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("transport.update");
    const body = (await req.json()) as Record<string, unknown>;
    const vehicle = await transportService.createVehicle(ctx.hotelId, {
      name: body.name as string, plate: body.plate as string, capacity: body.capacity as number | undefined,
      ownership: body.ownership as never, providerName: body.providerName as string | undefined,
      status: body.status as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
