/**
 * Module 3 — Réservations : API.
 * GET  /api/reservations          → liste (filtres ?status&from&to&guestId)
 * POST /api/reservations          → créer (RBAC reservations.create)
 */
import { NextResponse } from "next/server";
import { reservationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("reservations.view");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const guestId = url.searchParams.get("guestId") ?? undefined;
    const reservations = await reservationsService.listReservations(
      ctx.hotelId,
      {
        status: status as never,
        guestId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ reservations });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("reservations.create");
    const body = (await req.json()) as Record<string, unknown>;
    const reservation = await reservationsService.createReservation(
      ctx.hotelId,
      {
        guestId: body.guestId as string | undefined,
        roomId: body.roomId as string | undefined,
        roomTypeId: body.roomTypeId as string | undefined,
        source: body.source as never,
        channel: body.channel as string | undefined,
        arrivalDate: body.arrivalDate as string,
        departureDate: body.departureDate as string,
        adults: body.adults as number | undefined,
        children: body.children as number | undefined,
        baseRate: body.baseRate as number | undefined,
        discountAmount: body.discountAmount as number | undefined,
        currency: body.currency as string | undefined,
        notes: body.notes as string | undefined,
        confirmationNumber: body.confirmationNumber as string | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
