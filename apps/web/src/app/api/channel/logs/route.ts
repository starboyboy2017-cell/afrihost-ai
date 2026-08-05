/**
 * Module 25 — Channel Manager : logs de synchronisation.
 * GET /api/channel/logs?accountId= → liste (channel.view)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.view");
    const accountId = new URL(req.url).searchParams.get("accountId") ?? undefined;
    const logs = await channelService.listLogs(ctx.hotelId, accountId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ logs });
  } catch (err) { return errorResponse(err); }
}
