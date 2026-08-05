/**
 * Module 31 — Mobile : appareils enregistrés.
 * GET  → liste (mobile.view)
 * POST → enregistrer (mobile.manage)
 */
import { NextResponse } from "next/server";
import { mobileService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("mobile.view");
    const devices = await mobileService.listDevices(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ devices });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("mobile.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const device = await mobileService.registerDevice(ctx.hotelId, {
      installId: body.installId as string, deviceName: body.deviceName as string | undefined | null,
      platform: body.platform as string | undefined | null, userId: body.userId as string | undefined | null,
      guestId: body.guestId as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ device }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
