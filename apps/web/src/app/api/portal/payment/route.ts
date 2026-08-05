/**
 * Module 26 — Portail client : paiement sécurisé (acompte / solde).
 * POST /api/portal/payment (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    const res = await portalService.submitPayment(ctx.hotelId, guestId, {
      reservationId: body.reservationId as string | undefined | null, folioId: body.folioId as string | undefined | null,
      amount: body.amount as number, currency: body.currency as string, method: body.method as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ res }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
