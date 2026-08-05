/**
 * Module 7 — Check-in : API.
 * POST /api/reservations/:id/checkin  body: { roomId, notes? }  (reservations.checkin)
 */
import { NextResponse } from "next/server";
import { stayService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { reservationId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.checkin");
    const body = (await req.json()) as { roomId?: string; notes?: string };
    if (!body.roomId) return NextResponse.json({ error: "roomId requis" }, { status: 400 });
    const stay = await stayService.checkIn(ctx.hotelId, {
      reservationId: params.reservationId,
      roomId: body.roomId,
      notes: body.notes,
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
