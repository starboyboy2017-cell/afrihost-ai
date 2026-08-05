/**
 * Module 26 — Portail client : réservations.
 * GET  /api/portal/reservations?guestId= → liste (portal.self_reservation)
 * POST /api/portal/reservations/:action (modify|cancel) → via /api/portal/reservations/change
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const reservations = await portalService.listReservations(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ reservations });
  } catch (err) { return errorResponse(err); }
}
