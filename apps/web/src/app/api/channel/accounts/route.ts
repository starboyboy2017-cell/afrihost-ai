/**
 * Module 25 — Channel Manager : comptes OTA configurables.
 * GET  → liste (channel.view)
 * POST → créer (channel.manage)
 */
import { NextResponse } from "next/server";
import { channelService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("channel.view");
    const accounts = await channelService.listAccounts(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ accounts });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("channel.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const account = await channelService.createAccount(ctx.hotelId, {
      otaKey: body.otaKey as string, name: body.name as string,
      credentials: body.credentials as Record<string, unknown> | undefined,
      config: body.config as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
