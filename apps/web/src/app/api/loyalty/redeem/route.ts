/**
 * Module 22 — Fidélité : échange de points contre une récompense.
 * POST /api/loyalty/redeem (loyalty.redeem)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.redeem");
    const body = (await req.json()) as Record<string, unknown>;
    const redemption = await loyaltyService.redeem(ctx.hotelId, {
      guestId: body.guestId as string, rewardId: body.rewardId as string,
      reference: body.reference as string | undefined, metadata: body.metadata as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ redemption }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
