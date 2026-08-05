/**
 * Module 23 — Notifications : envoi immédiat ou programmé.
 * POST /api/notifications/send (notifications.send)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.send");
    const body = (await req.json()) as Record<string, unknown>;
    const send = await notificationsService.send(ctx.hotelId, {
      channel: body.channel as never, templateCode: body.templateCode as string,
      eventType: body.eventType as never | undefined,
      recipient: { recipientType: (body.recipient as Record<string, unknown>).recipientType as string, recipientId: (body.recipient as Record<string, unknown>).recipientId as string, recipient: (body.recipient as Record<string, unknown>).recipient as string | null | undefined },
      vars: body.vars as Record<string, unknown> | undefined, providerId: body.providerId as string | undefined | null,
      scheduleAt: body.scheduleAt as string | undefined | null, priority: body.priority as never | undefined,
      payload: body.payload as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ send }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
