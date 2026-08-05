/**
 * Module 25 — Channel Manager : statistiques de synchronisation.
 * GET /api/channel/stats?accountId= → stats (channel.view)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.view");
    const accountId = new URL(req.url).searchParams.get("accountId") ?? undefined;
    const stats = await channelService.syncStats(ctx.hotelId, accountId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ stats });
  } catch (err) { return errorResponse(err); }
}
