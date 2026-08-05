/**
 * Module 26 — Portail client : inscription.
 * POST /api/portal/auth/register (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const user = await portalService.register(ctx.hotelId, {
      hotelId: ctx.hotelId, guestId: body.guestId as string,
      email: body.email as string | undefined | null, phone: body.phone as string | undefined | null,
      password: body.password as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
