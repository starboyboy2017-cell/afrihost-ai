/**
 * Module 26 — Portail client : notifications, promotions et offres.
 * GET /api/portal/notifications?guestId= (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const notifications = await portalService.notifications(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ notifications });
  } catch (err) { return errorResponse(err); }
}
