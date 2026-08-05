/**
 * Module 23 — Notifications : déclencheur automatique (dispatché par les modules).
 * POST /api/notifications/events (notifications.send)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.send");
    const body = (await req.json()) as Record<string, unknown>;
    const created = await notificationsService.dispatchEvent({
      hotelId: ctx.hotelId, organisationId: ctx.organisationId,
      eventType: body.eventType as never,
      recipient: { recipientType: (body.recipient as Record<string, unknown>).recipientType as string, recipientId: (body.recipient as Record<string, unknown>).recipientId as string, recipient: (body.recipient as Record<string, unknown>).recipient as string | null | undefined },
      vars: body.vars as Record<string, unknown> | undefined, reference: body.reference as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ sends: created }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
