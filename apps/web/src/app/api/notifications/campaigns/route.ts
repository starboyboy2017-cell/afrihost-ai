/**
 * Module 23 — Notifications : campagnes programmées.
 * GET  → liste (notifications.view)
 * POST → créer (notifications.campaigns)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const campaigns = await notificationsService.listCampaigns(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ campaigns });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.campaigns");
    const body = (await req.json()) as Record<string, unknown>;
    const campaign = await notificationsService.createCampaign(ctx.hotelId, {
      name: body.name as string, channel: body.channel as never, templateCode: body.templateCode as string,
      segmentId: body.segmentId as string | undefined | null, audience: body.audience as Record<string, unknown> | undefined,
      scheduleAt: body.scheduleAt as string | undefined | null, config: body.config as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
