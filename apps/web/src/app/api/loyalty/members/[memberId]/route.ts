/**
 * Module 22 — Fidélité : synthèse d'un membre (solde, niveau, historique, notifications).
 * GET /api/loyalty/members/:id (loyalty.view)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { memberId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const summary = await loyaltyService.getMemberSummary(ctx.hotelId, params.memberId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ summary });
  } catch (err) { return errorResponse(err); }
}
