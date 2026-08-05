/**
 * Module 3 — Réservations : API une réservation.
 * GET   /api/reservations/:id       → détail
 * PATCH /api/reservations/:id       → modifier (reservations.update)
 * DELETE /api/reservations/:id      → annuler (reservations.cancel)
 */
import { NextResponse } from "next/server";
import { reservationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { reservationId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.view");
    const reservation = await reservationsService.getReservation(ctx.hotelId, params.reservationId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ reservation });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.update");
    const body = (await req.json()) as Record<string, unknown>;
    const reservation = await reservationsService.updateReservation(
      ctx.hotelId,
      params.reservationId,
      body,
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ reservation });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.cancel");
    const reservation = await reservationsService.cancel(ctx.hotelId, params.reservationId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ reservation });
  } catch (err) {
    return errorResponse(err);
  }
}
