/**
 * Module 22 — Fidélité : ajustement manuel de points.
 * POST /api/loyalty/adjust (loyalty.adjust)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.adjust");
    const body = (await req.json()) as Record<string, unknown>;
    const transaction = await loyaltyService.adjustPoints(ctx.hotelId, {
      guestId: body.guestId as string, points: body.points as number, reason: body.reason as string,
      reference: body.reference as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
