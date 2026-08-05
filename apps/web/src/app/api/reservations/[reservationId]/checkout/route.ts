/**
 * Module 7 — Check-out : API.
 * POST /api/reservations/:id/checkout  body: { notes? }  (reservations.checkout)
 */
import { NextResponse } from "next/server";
import { stayService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { reservationId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.checkout");
    const body = (await req.json()) as { notes?: string };
    const stay = await stayService.checkOut(ctx.hotelId, {
      reservationId: params.reservationId,
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
