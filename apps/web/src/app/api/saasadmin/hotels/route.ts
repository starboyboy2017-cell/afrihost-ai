/**
 * Module 33 — Super Admin : gestion des hôtels.
 * GET  → liste (saasadmin.hotels)
 * POST → créer (saasadmin.hotels)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.hotels");
    const hotels = await saasAdminService.listHotels({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ hotels });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.hotels");
    const body = (await req.json()) as Record<string, unknown>;
    const hotel = await saasAdminService.createHotel(body.organisationId as string, {
      name: body.name as string, code: body.code as string, city: body.city as string | undefined | null,
      country: body.country as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ hotel }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
