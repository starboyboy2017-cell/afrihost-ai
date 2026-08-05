/**
 * Module 26 — Portail client : check-out en ligne.
 * POST /api/portal/checkout (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    await portalService.onlineCheckout(ctx.hotelId, guestId, body.reservationId as string, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
