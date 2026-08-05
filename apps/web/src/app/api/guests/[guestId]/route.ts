/**
 * Module Guests — Clients : API un client.
 * GET    /api/guests/:id     → détail (guests.view)
 * PATCH  /api/guests/:id     → modifier (guests.update)
 * DELETE /api/guests/:id     → archiver (guests.update)
 * GET    /api/guests/:id/stays → historique des séjours (guests.view)
 */
import { NextResponse } from "next/server";
import { guestsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { guestId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("guests.view");
    const guest = await guestsService.getGuest(ctx.hotelId, params.guestId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ guest });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("guests.update");
    const body = (await req.json()) as Record<string, unknown>;
    const guest = await guestsService.updateGuest(ctx.hotelId, params.guestId, body, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ guest });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("guests.update");
    const guest = await guestsService.archiveGuest(ctx.hotelId, params.guestId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ guest });
  } catch (err) {
    return errorResponse(err);
  }
}
