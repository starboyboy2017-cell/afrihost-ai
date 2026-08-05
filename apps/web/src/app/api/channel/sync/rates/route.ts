/**
 * Module 25 — Channel Manager : sync tarifs (PMS → OTA).
 * POST /api/channel/sync/rates (channel.sync)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.sync");
    const body = (await req.json()) as Record<string, unknown>;
    const job = await channelService.pushRates(ctx.hotelId, {
      accountId: body.accountId as string,
      updates: (body.updates as Array<{ date: string; roomTypeId: string; price: number; currency?: string }>) ?? [],
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
