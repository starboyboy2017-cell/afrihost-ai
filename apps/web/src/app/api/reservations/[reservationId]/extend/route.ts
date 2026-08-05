/**
 * Module 7 — Prolongation de séjour : API.
 * POST /api/reservations/:id/extend  body: { newDepartureDate }  (reservations.update)
 */
import { NextResponse } from "next/server";
import { stayService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { reservationId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.update");
    const body = (await req.json()) as { newDepartureDate?: string };
    if (!body.newDepartureDate) return NextResponse.json({ error: "newDepartureDate requis" }, { status: 400 });
    const stay = await stayService.extendStay(ctx.hotelId, {
      reservationId: params.reservationId,
      newDepartureDate: body.newDepartureDate,
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
