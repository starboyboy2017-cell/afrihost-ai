/**
 * Module 23 — Notifications : lancer une campagne.
 * POST /api/notifications/campaigns/:id/launch (notifications.campaigns)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: { campaignId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("notifications.campaigns");
    await notificationsService.launchCampaign(ctx.hotelId, params.campaignId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
