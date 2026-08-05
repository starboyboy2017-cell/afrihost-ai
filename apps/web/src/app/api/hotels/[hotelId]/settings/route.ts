/**
 * Module 1 — Paramètres généraux : API réglages d'un hôtel.
 * GET  /api/hotels/:hotelId/settings → réglages de l'hôtel
 * PATCH /api/hotels/:hotelId/settings → met à jour (HOTEL_OWNER / manager)
 */
import { NextResponse } from "next/server";
import { settingsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { hotelId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("settings.hotel.view");
    const settings = await settingsService.getHotelSettings(params.hotelId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    if (!settings) return NextResponse.json({ error: "Hôtel introuvable" }, { status: 404 });
    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("settings.hotel.update");
    const body = (await req.json()) as Record<string, unknown>;
    const updated = await settingsService.updateHotelSettings(
      params.hotelId,
      body,
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ settings: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
