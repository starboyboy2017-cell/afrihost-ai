/**
 * Module 23 — Notifications : déclencheurs automatiques.
 * GET  → liste (notifications.view)
 * POST → créer (notifications.manage)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const triggers = await notificationsService.listTriggers(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ triggers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const trigger = await notificationsService.createTrigger(ctx.hotelId, {
      eventType: body.eventType as never, channel: body.channel as never, templateCode: body.templateCode as string,
      condition: body.condition as Record<string, unknown> | undefined, priority: body.priority as never | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ trigger }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
