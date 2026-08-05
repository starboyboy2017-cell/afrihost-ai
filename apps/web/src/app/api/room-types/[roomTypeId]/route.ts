/**
 * Module 5 — Types de chambres : API un type.
 * GET   /api/room-types/:id → détail
 * PATCH /api/room-types/:id → modifier (roomTypes.update)
 */
import { NextResponse } from "next/server";
import { roomTypesService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { roomTypeId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const roomType = await roomTypesService.getRoomType(ctx.hotelId, params.roomTypeId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ roomType });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("roomTypes.update");
    const body = (await req.json()) as Record<string, unknown>;
    const roomType = await roomTypesService.updateRoomType(ctx.hotelId, params.roomTypeId, body, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ roomType });
  } catch (err) {
    return errorResponse(err);
  }
}
