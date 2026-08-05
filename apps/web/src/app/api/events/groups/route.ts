/**
 * Module 27 — Événements & Groupes : groupes.
 * GET  /api/events/groups?status= → liste (events.view)
 * POST → créer (events.manage)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const groups = await eventsService.listGroups(ctx.hotelId, status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ groups });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const group = await eventsService.createGroup(ctx.hotelId, {
      companyId: body.companyId as string | undefined | null, name: body.name as string,
      type: body.type as string | undefined, contactName: body.contactName as string | undefined | null,
      contactEmail: body.contactEmail as string | undefined | null, contactPhone: body.contactPhone as string | undefined | null,
      totalRooms: body.totalRooms as number | undefined, arrivalDate: body.arrivalDate as string | undefined | null,
      departureDate: body.departureDate as string | undefined | null, notes: body.notes as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
