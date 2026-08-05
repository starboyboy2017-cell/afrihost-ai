/**
 * Module 2 — Gestion multihôtels : API hôtels.
 * GET   /api/hotels        → liste des hôtels de l'organisation (gestion)
 * POST  /api/hotels        → créer un hôtel (HOTEL_OWNER)
 */
import { NextResponse } from "next/server";
import { hotelsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("hotels.update");
    const hotels = await hotelsService.listHotels(ctx.organisationId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ hotels });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("hotels.create");
    const body = (await req.json()) as Record<string, unknown>;
    const hotel = await hotelsService.createHotel(
      ctx.organisationId,
      {
        name: body.name as string,
        slug: body.slug as string,
        code: body.code as string,
        address: body.address as string | undefined,
        city: body.city as string | undefined,
        country: body.country as string | undefined,
        phone: body.phone as string | undefined,
        email: body.email as string | undefined,
        currency: body.currency as string | undefined,
        locale: body.locale as string | undefined,
        timezone: body.timezone as string | undefined,
        vatRate: body.vatRate as number | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
      ctx.userId,
    );
    return NextResponse.json({ hotel }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
