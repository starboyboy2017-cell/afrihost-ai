/**
 * Module 26 — Portail client : modification / annulation de réservation.
 * POST /api/portal/reservations/change (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    await portalService.changeReservation(ctx.hotelId, guestId, {
      reservationId: body.reservationId as string, action: body.action as "modify" | "cancel",
      newArrivalDate: body.newArrivalDate as string | undefined | null,
      newDepartureDate: body.newDepartureDate as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
