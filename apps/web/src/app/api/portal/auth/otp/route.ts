/**
 * Module 26 — Portail client : demande d'OTP.
 * POST /api/portal/auth/otp (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const res = await portalService.requestOtp(ctx.hotelId, { identifier: body.identifier as string, channel: body.channel as "email" | "sms" }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ res });
  } catch (err) { return errorResponse(err); }
}
