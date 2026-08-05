/**
 * Module 22 — Fidélité : bonus (bienvenue, anniversaire, parrainage, campagne).
 * GET  → liste (loyalty.view)
 * POST → créer (loyalty.manage)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const bonuses = await loyaltyService.listBonuses(ctx.hotelId, params.programId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ bonuses });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const bonus = await loyaltyService.createBonus(ctx.hotelId, params.programId, {
      name: body.name as string, bonusType: body.bonusType as never, points: body.points as number,
      condition: body.condition as Record<string, unknown> | undefined,
      startsAt: body.startsAt as string | undefined, endsAt: body.endsAt as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ bonus }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
