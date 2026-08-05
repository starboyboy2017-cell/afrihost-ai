/**
 * Module 3 — Réservations : transitions de statut.
 * POST /api/reservations/:id/status  body: { action: "confirm"|"checkin"|"checkout"|"no_show"|"cancel" }
 * GET  /api/reservations/:id/status  → historique des statuts
 */
import { NextResponse } from "next/server";
import { reservationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { reservationId: string } };

const PERMISSIONS: Record<string, "reservations.confirm" | "reservations.checkin" | "reservations.checkout" | "reservations.cancel"> = {
  confirm: "reservations.confirm",
  checkin: "reservations.checkin",
  checkout: "reservations.checkout",
  cancel: "reservations.cancel",
};

export async function POST(req: Request, { params }: Ctx) {
  try {
    const body = (await req.json()) as { action?: string; reason?: string };
    const permission = PERMISSIONS[body.action ?? ""];
    if (!permission) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    const ctx = await requireAuthAndPermission(permission);
    const actor = { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId };

    let reservation;
    switch (body.action) {
      case "confirm":
        reservation = await reservationsService.confirm(ctx.hotelId, params.reservationId, actor);
        break;
      case "checkin":
        reservation = await reservationsService.checkIn(ctx.hotelId, params.reservationId, actor);
        break;
      case "checkout":
        reservation = await reservationsService.checkOut(ctx.hotelId, params.reservationId, actor);
        break;
      case "cancel":
        reservation = await reservationsService.cancel(ctx.hotelId, params.reservationId, actor, body.reason);
        break;
    }
    return NextResponse.json({ reservation });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("reservations.view");
    const history = await reservationsService.history(ctx.hotelId, params.reservationId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ history });
  } catch (err) {
    return errorResponse(err);
  }
}
