/**
 * Module 15 — Caisse : sessions.
 * GET  /api/cash/sessions?status → liste (caisse.view)
 * POST /api/cash/sessions        → ouverture (caisse.manage)
 */
import { NextResponse } from "next/server";
import { cashService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("caisse.view");
    const url = new URL(req.url);
    const sessions = await cashService.listSessions(ctx.hotelId, (url.searchParams.get("status") ?? undefined) as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ sessions });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("caisse.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const session = await cashService.openSession(ctx.hotelId, { registerId: body.registerId as string, openingAmount: body.openingAmount as number | undefined, cashierId: ctx.userId, note: body.note as string | undefined }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
