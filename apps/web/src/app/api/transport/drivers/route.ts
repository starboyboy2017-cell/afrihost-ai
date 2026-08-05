/**
 * Module 12 — Transport : chauffeurs.
 * GET  /api/transport/drivers → liste (transport.view)
 * POST /api/transport/drivers → créer (transport.update)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("transport.view");
    const drivers = await transportService.listDrivers(ctx.hotelId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ drivers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("transport.update");
    const body = (await req.json()) as Record<string, unknown>;
    const driver = await transportService.createDriver(ctx.hotelId, {
      firstName: body.firstName as string, lastName: body.lastName as string,
      phone: body.phone as string | undefined, licenseNo: body.licenseNo as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ driver }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
