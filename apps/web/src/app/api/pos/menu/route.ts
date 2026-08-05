/**
 * Module 13 — POS : menus.
 * POST /api/pos/menu?posPointId=..  body: { name, lines: [{productId, price, taxRate}] }  (pos.sell)
 * GET  /api/pos/menu?posPointId=.. → lignes du menu (pos.view)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("pos.view");
    const url = new URL(req.url);
    const posPointId = url.searchParams.get("posPointId");
    if (!posPointId) return NextResponse.json({ error: "posPointId requis" }, { status: 400 });
    const lines = await posService.listMenuLines(ctx.hotelId, posPointId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ lines });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("pos.sell");
    const url = new URL(req.url);
    const posPointId = url.searchParams.get("posPointId");
    if (!posPointId) return NextResponse.json({ error: "posPointId requis" }, { status: 400 });
    const body = (await req.json()) as Record<string, unknown>;
    const menu = await posService.createMenu(ctx.hotelId, posPointId, body.name as string, (body.lines as never[]) ?? [], { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ menu }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
