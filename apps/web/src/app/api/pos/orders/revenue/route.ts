/**
 * Module 13 — POS : chiffre d'affaires.
 * GET /api/pos/orders/revenue (pos.view)
 */
import { NextResponse } from "next/server";
import { posService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("pos.view");
    const revenue = await posService.getRevenue(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ revenue });
  } catch (err) { return errorResponse(err); }
}
