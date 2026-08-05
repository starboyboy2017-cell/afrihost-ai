/**
 * Module 12 — Transport : réservations de transfert.
 * GET  /api/transport/transfers?status&reservationId → liste (transport.view)
 * POST /api/transport/transfers                        → créer (transport.create)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("transport.view");
    const url = new URL(req.url);
    const result = await transportService.listTransfers(ctx.hotelId, {
      status: (url.searchParams.get("status") ?? undefined) as never,
      reservationId: url.searchParams.get("reservationId") ?? undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("transport.create");
    const body = (await req.json()) as Record<string, unknown>;
    const transfer = await transportService.createTransfer(ctx.hotelId, {
      guestId: body.guestId as string | undefined,
      reservationId: body.reservationId as string | undefined,
      type: body.type as never,
      pickupLocation: body.pickupLocation as string,
      dropoffLocation: body.dropoffLocation as string,
      scheduledAt: body.scheduledAt as string,
      paxCount: body.paxCount as number | undefined,
      notes: body.notes as string | undefined,
      amount: body.amount as number | undefined,
      currency: body.currency as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
