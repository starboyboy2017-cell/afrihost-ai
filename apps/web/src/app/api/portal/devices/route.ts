/**
 * Module 26 — Portail client : appareils connectés.
 * GET  /api/portal/devices?portalUserId= → liste
 * POST → révoquer un appareil
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.view");
    const portalUserId = new URL(req.url).searchParams.get("portalUserId") ?? "";
    const devices = await portalService.listDevices(ctx.hotelId, portalUserId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ devices });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.manage");
    const body = (await req.json()) as Record<string, unknown>;
    await portalService.revokeDevice(ctx.hotelId, body.deviceId as string, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
