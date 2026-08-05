/**
 * Module 25 — Channel Manager : mappings chambres PMS ↔ OTA.
 * GET  /api/channel/mappings?accountId= → liste (channel.view)
 * POST → créer (channel.manage)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.view");
    const accountId = new URL(req.url).searchParams.get("accountId") ?? undefined;
    const mappings = await channelService.listMappings(ctx.hotelId, accountId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ mappings });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const mapping = await channelService.createMapping(ctx.hotelId, {
      accountId: body.accountId as string, roomTypeId: body.roomTypeId as string,
      otaRoomId: body.otaRoomId as string, otaRoomName: body.otaRoomName as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ mapping }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
