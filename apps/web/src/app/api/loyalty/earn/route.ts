/**
 * Module 22 — Fidélité : attribution de points via le moteur de règles.
 * POST /api/loyalty/earn (loyalty.award) — déclencheurs : nuit, dépense, service,
 * promotion, campagne, parrainage, bienvenue, anniversaire, personnalisé.
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.award");
    const body = (await req.json()) as Record<string, unknown>;
    const transactions = await loyaltyService.awardPoints(ctx.hotelId, {
      guestId: body.guestId as string, trigger: body.trigger as never,
      context: body.context as Record<string, unknown> | undefined,
      reference: body.reference as string | undefined, sourceModule: body.sourceModule as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ transactions }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
