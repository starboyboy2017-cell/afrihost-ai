/**
 * Module 31 — Mobile : notifications push.
 * GET  → liste des tokens (mobile.view)
 * POST → enregistrer un token (mobile.manage)
 */
import { NextResponse } from "next/server";
import { mobileService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("mobile.view");
    const tokens = await mobileService.listPushTokens(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ tokens });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("mobile.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const token = await mobileService.registerPushToken(ctx.hotelId, {
      token: body.token as string, platform: body.platform as string | undefined | null,
      deviceId: body.deviceId as string | undefined | null, userId: body.userId as string | undefined | null,
      guestId: body.guestId as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ token }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
