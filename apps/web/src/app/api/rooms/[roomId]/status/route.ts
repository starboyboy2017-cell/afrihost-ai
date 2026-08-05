/**
 * Module 6 — Chambres : changement d'état (machine à états BR-4.2).
 * POST /api/rooms/:id/status  body: { status, reason? }  (roomStatus.update)
 * GET  /api/rooms/:id/status  → historique des états (rooms.view)
 */
import { NextResponse } from "next/server";
import { roomsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { roomId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("roomStatus.update");
    const body = (await req.json()) as { status?: string; reason?: string };
    if (!body.status) return NextResponse.json({ error: "status requis" }, { status: 400 });
    const room = await roomsService.changeStatus(ctx.hotelId, params.roomId, body.status as never, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    }, body.reason);
    return NextResponse.json({ room });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const history = await roomsService.history(ctx.hotelId, params.roomId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ history });
  } catch (err) {
    return errorResponse(err);
  }
}
