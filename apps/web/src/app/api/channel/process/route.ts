/**
 * Module 25 — Channel Manager : traitement de la file d'attente.
 * POST /api/channel/process (channel.sync) — déclenche les jobs dus.
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST() {
  try {
    const ctx = await requireAuthAndPermission("channel.sync");
    const processed = await channelService.processDue(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ processed });
  } catch (err) { return errorResponse(err); }
}
