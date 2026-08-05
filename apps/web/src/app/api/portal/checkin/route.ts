/**
 * Module 26 — Portail client : check-in en ligne.
 * POST /api/portal/checkin (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    await portalService.onlineCheckin(ctx.hotelId, guestId, {
      reservationId: body.reservationId as string, idDocument: body.idDocument as string | undefined | null,
      idDocumentType: body.idDocumentType as string | undefined | null, vehiclePlate: body.vehiclePlate as string | undefined | null,
      notes: body.notes as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
