/**
 * Module 23 — Notifications : prévisualisation d'un template.
 * POST /api/notifications/templates/preview (notifications.view)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const body = (await req.json()) as Record<string, unknown>;
    const rendered = await notificationsService.previewTemplate(ctx.hotelId, body.channel as never, body.code as string, (body.vars as Record<string, unknown>) ?? {}, body.locale as string | undefined, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rendered });
  } catch (err) { return errorResponse(err); }
}
