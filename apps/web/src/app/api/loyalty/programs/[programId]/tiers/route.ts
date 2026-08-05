/**
 * Module 22 — Fidélité : niveaux (tiers).
 * GET  → liste (loyalty.view)
 * POST → créer (loyalty.manage)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const tiers = await loyaltyService.listTiers(ctx.hotelId, params.programId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ tiers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const tier = await loyaltyService.createTier(ctx.hotelId, params.programId, {
      code: body.code as string, name: body.name as string, rank: body.rank as number | undefined,
      minPoints: body.minPoints as number | undefined, minStays: body.minStays as number | undefined,
      minSpend: body.minSpend as number | undefined, benefits: body.benefits as Record<string, unknown> | undefined,
      accessRules: body.accessRules as Record<string, unknown> | undefined, keepRules: body.keepRules as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ tier }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
