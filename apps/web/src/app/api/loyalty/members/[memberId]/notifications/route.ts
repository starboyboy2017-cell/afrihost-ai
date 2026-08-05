/**
 * Module 22 — Fidélité : notifications d'un membre.
 * GET  /api/loyalty/members/:id/notifications → liste (loyalty.view)
 * POST /api/loyalty/members/:id/notifications → tout marquer lu (loyalty.view)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { memberId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const notifications = await loyaltyService.listNotifications(ctx.hotelId, params.memberId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ notifications });
  } catch (err) { return errorResponse(err); }
}

export async function POST(_req: Request, { params }: { params: { memberId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    await loyaltyService.markNotificationsRead(ctx.hotelId, params.memberId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
