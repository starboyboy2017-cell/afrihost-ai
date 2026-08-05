/**
 * Module 23 — Notifications : mise à jour de statut (webhook fournisseur).
 * POST /api/notifications/sends/:id/status (notifications.view)
 * Corps : { status: "DELIVERED" | "READ" | "FAILED" }
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { sendId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const body = (await req.json()) as Record<string, unknown>;
    await notificationsService.updateStatus(ctx.hotelId, params.sendId, body.status as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
