/**
 * Module Guests — Clients : historique des séjours.
 * GET /api/guests/:id/stays (guests.view)
 */
import { NextResponse } from "next/server";
import { guestsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { guestId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("guests.view");
    const stays = await guestsService.stays(ctx.hotelId, params.guestId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ stays });
  } catch (err) {
    return errorResponse(err);
  }
}
