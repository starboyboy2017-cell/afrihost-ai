/**
 * Module 26 — Portail client : connexion (email/téléphone + mot de passe ou OTP).
 * POST /api/portal/auth/login (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const user = await portalService.login(ctx.hotelId, {
      identifier: body.identifier as string, password: body.password as string | undefined | null,
      otp: body.otp as string | undefined | null, deviceName: body.deviceName as string | undefined | null,
      platform: body.platform as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ user });
  } catch (err) { return errorResponse(err); }
}
