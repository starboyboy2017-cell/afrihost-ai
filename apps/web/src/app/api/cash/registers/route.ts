/**
 * Module 15 — Caisse : caisses (tiroirs).
 * GET  /api/cash/registers → liste (caisse.view)
 * POST /api/cash/registers → créer (caisse.manage)
 */
import { NextResponse } from "next/server";
import { cashService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("caisse.view");
    const registers = await cashService.listRegisters(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ registers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("caisse.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const register = await cashService.createRegister(ctx.hotelId, { name: body.name as string, posPointId: body.posPointId as string | undefined }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ register }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
