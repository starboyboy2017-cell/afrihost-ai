/**
 * Module 27 — Événements & Groupes : événements.
 * GET  /api/events?status=&venueId= → liste (events.view)
 * POST → créer (events.manage) — vérifie la disponibilité de la salle
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const venueId = url.searchParams.get("venueId") ?? undefined;
    const events = await eventsService.listEvents(ctx.hotelId, status, venueId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ events });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const event = await eventsService.createEvent(ctx.hotelId, {
      groupId: body.groupId as string | undefined | null, venueId: body.venueId as string | undefined | null,
      name: body.name as string, eventType: body.eventType as string | undefined,
      startAt: body.startAt as string | undefined | null, endAt: body.endAt as string | undefined | null,
      expectedAttendees: body.expectedAttendees as number | undefined, notes: body.notes as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
