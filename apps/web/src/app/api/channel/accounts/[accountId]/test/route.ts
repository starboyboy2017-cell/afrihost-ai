/**
 * Module 25 — Channel Manager : tester la connexion d'un compte OTA.
 * POST /api/channel/accounts/:id/test (channel.manage)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: { accountId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("channel.manage");
    const res = await channelService.testConnection(ctx.hotelId, params.accountId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ res });
  } catch (err) { return errorResponse(err); }
}
