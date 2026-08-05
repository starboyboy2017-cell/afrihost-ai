/**
 * Module 27 — Événements & Groupes : allocation de chambres groupe.
 * POST /api/events/groups/:id/allocate-rooms (events.manage)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("events.manage");
    const body = (await req.json()) as Record<string, unknown>;
    await eventsService.allocateRooms(ctx.hotelId, params.groupId, body.rooms as number, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
