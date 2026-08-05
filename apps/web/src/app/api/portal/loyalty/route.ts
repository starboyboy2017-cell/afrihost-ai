/**
 * Module 26 — Portail client : programme de fidélité (points, niveau).
 * GET /api/portal/loyalty?guestId= (portal.view_loyalty)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.view_loyalty");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const dashboard = await portalService.dashboard(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ loyalty: { points: dashboard.loyaltyPoints, tier: dashboard.loyaltyTier } });
  } catch (err) { return errorResponse(err); }
}
