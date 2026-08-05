/**
 * Module 27 — Événements & Groupes : salles.
 * GET  → liste (events.view)
 * POST → créer (events.manage)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const venues = await eventsService.listVenues(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ venues });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const venue = await eventsService.createVenue(ctx.hotelId, {
      name: body.name as string, capacity: body.capacity as number | undefined,
      seatingModes: body.seatingModes as Record<string, unknown> | undefined,
      basePrice: body.basePrice as number | undefined, currency: body.currency as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ venue }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
