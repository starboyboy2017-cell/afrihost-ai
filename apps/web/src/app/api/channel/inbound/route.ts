/**
 * Module 25 — Channel Manager : réception de réservation OTA (inbound).
 * POST /api/channel/inbound (channel.inbound) — webhook OTA.
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.inbound");
    const body = (await req.json()) as Record<string, unknown>;
    const job = await channelService.processBooking(ctx.hotelId, {
      accountId: body.accountId as string,
      booking: (body.booking as Record<string, unknown>) as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
