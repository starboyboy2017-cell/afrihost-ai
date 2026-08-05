/**
 * Module 26 — Portail client : profil.
 * PUT /api/portal/profile (portal.guest_profile)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function PUT(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.guest_profile");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    await portalService.updateProfile(ctx.hotelId, guestId, {
      firstName: body.firstName as string | undefined, lastName: body.lastName as string | undefined,
      email: body.email as string | undefined | null, phone: body.phone as string | undefined | null,
      nationality: body.nationality as string | undefined | null, address: body.address as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
