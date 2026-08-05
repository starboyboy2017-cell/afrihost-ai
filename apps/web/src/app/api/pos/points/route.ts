/**
 * Module 13 — POS : points de vente.
 * GET  /api/pos/points → liste (pos.view)
 * POST /api/pos/points → créer (pos.sell / pos.view pour lecture, création = pos.sell)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("pos.view");
    const points = await posService.listPosPoints(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ points });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("pos.sell");
    const body = (await req.json()) as Record<string, unknown>;
    const point = await posService.createPosPoint(ctx.hotelId, { name: body.name as string, kind: body.kind as never }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ point }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
