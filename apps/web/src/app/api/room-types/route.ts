/**
 * Module 5 — Types de chambres : API.
 * GET  /api/room-types          → liste (roomTypes.view implicit via roomTypes.update? non → guest de lecture)
 * POST /api/room-types          → créer (roomTypes.create)
 */
import { NextResponse } from "next/server";
import { roomTypesService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const roomTypes = await roomTypesService.listRoomTypes(ctx.hotelId, includeInactive, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ roomTypes });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("roomTypes.create");
    const body = (await req.json()) as Record<string, unknown>;
    const roomType = await roomTypesService.createRoomType(
      ctx.hotelId,
      {
        name: body.name as string,
        description: body.description as string | undefined,
        baseRate: body.baseRate as number,
        maxOccupancy: body.maxOccupancy as number | undefined,
        bedCount: body.bedCount as number | undefined,
        amenities: body.amenities as string[] | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ roomType }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
