/**
 * Module 1 — Paramètres généraux : API organisation.
 * GET  /api/org  → réglages d'organisation + hôtels
 * PATCH /api/org → met à jour les réglages d'organisation (ORG_ADMIN / propriétaire)
 */
import { NextResponse } from "next/server";
import { settingsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("settings.organisation.view");
    const org = await settingsService.getOrganisation(ctx.organisationId);
    const hotels = await settingsService.listHotels(ctx.organisationId);
    return NextResponse.json({ organisation: org, hotels });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("settings.organisation.update");
    const body = (await req.json()) as Record<string, unknown>;
    const updated = await settingsService.updateOrganisation(
      ctx.organisationId,
      {
        name: body.name as string | undefined,
        legalName: body.legalName as string | undefined,
        logoUrl: body.logoUrl as string | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ organisation: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
