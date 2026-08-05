/**
 * Module 22 — Fidélité : historique des transactions de points d'un membre.
 * GET /api/loyalty/members/:id/transactions (loyalty.view)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { memberId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const transactions = await loyaltyService.getTransactions(ctx.hotelId, params.memberId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ transactions });
  } catch (err) { return errorResponse(err); }
}
