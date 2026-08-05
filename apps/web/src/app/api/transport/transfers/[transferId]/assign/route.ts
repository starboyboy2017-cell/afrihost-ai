/**
 * Module 12 — Transport : affectation véhicule + chauffeur.
 * POST /api/transport/transfers/:id/assign  body: { vehicleId, driverId }  (transport.assign)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { transferId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("transport.assign");
    const body = (await req.json()) as { vehicleId?: string; driverId?: string };
    if (!body.vehicleId || !body.driverId) return NextResponse.json({ error: "vehicleId et driverId requis" }, { status: 400 });
    const transfer = await transportService.assign(ctx.hotelId, params.transferId, body.vehicleId, body.driverId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ transfer });
  } catch (err) { return errorResponse(err); }
}
