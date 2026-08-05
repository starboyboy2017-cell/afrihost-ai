/**
 * Module 2 — Gestion multihôtels : API un hôtel.
 * GET    /api/hotels/:hotelId  → détail d'un hôtel
 * PATCH  /api/hotels/:hotelId  → modifier (HOTEL_OWNER)
 * DELETE /api/hotels/:hotelId  → désactiver (HOTEL_OWNER)
 */
import { NextResponse } from "next/server";
import { hotelsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { hotelId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("hotels.update");
    const hotel = await hotelsService["listHotels"](ctx.organisationId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    const found = hotel.find((h) => h.id === params.hotelId);
    if (!found) return NextResponse.json({ error: "Hôtel introuvable" }, { status: 404 });
    return NextResponse.json({ hotel: found });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("hotels.update");
    const body = (await req.json()) as Record<string, unknown>;
    const hotel = await hotelsService.updateHotel(
      params.hotelId,
      body,
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ hotel });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("hotels.disable");
    const hotel = await hotelsService.deactivateHotel(params.hotelId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ hotel });
  } catch (err) {
    return errorResponse(err);
  }
}
