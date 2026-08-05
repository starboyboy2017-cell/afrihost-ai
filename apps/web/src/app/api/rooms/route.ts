/**
 * Module 6 — Chambres : API.
 * GET  /api/rooms?roomTypeId&status&floor&search → liste (rooms.view)
 * POST /api/rooms                                 → créer (rooms.create)
 */
import { NextResponse } from "next/server";
import { roomsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const url = new URL(req.url);
    const result = await roomsService.listRooms(
      ctx.hotelId,
      {
        roomTypeId: url.searchParams.get("roomTypeId") ?? undefined,
        status: (url.searchParams.get("status") ?? undefined) as never,
        floor: url.searchParams.get("floor") ? Number(url.searchParams.get("floor")) : undefined,
        search: url.searchParams.get("search") ?? undefined,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("rooms.create");
    const body = (await req.json()) as Record<string, unknown>;
    const room = await roomsService.createRoom(
      ctx.hotelId,
      {
        roomTypeId: body.roomTypeId as string,
        number: body.number as string,
        floor: body.floor as number | undefined,
        keyCardEnabled: body.keyCardEnabled as boolean | undefined,
        photos: body.photos as string[] | undefined,
        initialStatus: body.initialStatus as never,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
