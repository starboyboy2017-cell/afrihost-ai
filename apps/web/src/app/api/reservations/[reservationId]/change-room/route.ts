/**
 * Module 7 — Changement de chambre : API.
 * POST /api/reservations/:id/change-room  body: { newRoomId, reason? }  (reservations.update)
 * GET  /api/reservations/:id/change-room  → historique des changements (reservations.view)
 */
import { NextResponse } from "next/server";
import { stayService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { reservationId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.update");
    const body = (await req.json()) as { newRoomId?: string; reason?: string };
    if (!body.newRoomId) return NextResponse.json({ error: "newRoomId requis" }, { status: 400 });
    const stay = await stayService.changeRoom(ctx.hotelId, {
      reservationId: params.reservationId,
      newRoomId: body.newRoomId,
      reason: body.reason,
    }, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ stay });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.view");
    const assignments = await stayService.roomAssignments(ctx.hotelId, params.reservationId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ assignments });
  } catch (err) {
    return errorResponse(err);
  }
}
