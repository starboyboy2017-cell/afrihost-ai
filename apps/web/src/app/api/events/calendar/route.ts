/**
 * Module 27 — Événements & Groupes : calendrier interactif des salles.
 * GET /api/events/calendar?venueId=&from=&to= (events.view)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const url = new URL(req.url);
    const venueId = url.searchParams.get("venueId") ?? undefined;
    const from = new Date(url.searchParams.get("from") ?? Date.now() - 30 * 86400000);
    const to = new Date(url.searchParams.get("to") ?? Date.now() + 90 * 86400000);
    const events = await eventsService.calendar(ctx.hotelId, venueId, from, to, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ events });
  } catch (err) { return errorResponse(err); }
}
