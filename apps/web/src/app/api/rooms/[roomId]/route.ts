/**
 * Module 6 — Chambres : API une chambre.
 * GET   /api/rooms/:id   → détail (rooms.view)
 * PATCH /api/rooms/:id   → modifier (rooms.update)
 */
import { NextResponse } from "next/server";
import { roomsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { roomId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const room = await roomsService.getRoom(ctx.hotelId, params.roomId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ room });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("rooms.update");
    const body = (await req.json()) as Record<string, unknown>;
    const room = await roomsService.updateRoom(ctx.hotelId, params.roomId, body, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ room });
  } catch (err) {
    return errorResponse(err);
  }
}
