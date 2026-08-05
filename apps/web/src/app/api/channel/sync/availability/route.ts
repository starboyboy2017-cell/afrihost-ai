/**
 * Module 25 — Channel Manager : sync disponibilités (PMS → OTA).
 * POST /api/channel/sync/availability (channel.sync)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.sync");
    const body = (await req.json()) as Record<string, unknown>;
    const job = await channelService.pushAvailability(ctx.hotelId, {
      accountId: body.accountId as string,
      updates: (body.updates as Array<{ date: string; rooms: number }>) ?? [],
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
