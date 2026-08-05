/**
 * Module 25 — Channel Manager : jobs de synchronisation.
 * GET /api/channel/jobs?status= → liste (channel.view)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.view");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const jobs = await channelService.listJobs(ctx.hotelId, status as never | undefined, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ jobs });
  } catch (err) { return errorResponse(err); }
}
