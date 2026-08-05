/**
 * Module 30 — API Publique : déclencher un événement webhook.
 * POST /api/publicapi/webhooks/dispatch { event, payload } (publicapi.manage)
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const count = await publicApiService.dispatchEvent(ctx.hotelId, body.event as string, (body.payload as Record<string, unknown>) ?? {}, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ dispatched: count });
  } catch (err) { return errorResponse(err); }
}
