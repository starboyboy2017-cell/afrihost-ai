/**
 * Module 26 — Portail client : tableau de bord.
 * GET /api/portal/dashboard?guestId= (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const dashboard = await portalService.dashboard(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ dashboard });
  } catch (err) { return errorResponse(err); }
}
