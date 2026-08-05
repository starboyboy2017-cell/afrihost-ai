/**
 * Module 23 — Notifications : historique complet des envois.
 * GET /api/notifications/sends?status= (notifications.view)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const sends = await notificationsService.listSends(ctx.hotelId, status as never | undefined, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ sends });
  } catch (err) { return errorResponse(err); }
}
