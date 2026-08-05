/**
 * Module 22 — Fidélité : récompenses.
 * GET  → liste (loyalty.view)
 * POST → créer (loyalty.manage)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const rewards = await loyaltyService.listRewards(ctx.hotelId, params.programId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rewards });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const reward = await loyaltyService.createReward(ctx.hotelId, params.programId, {
      name: body.name as string, type: body.type as never, pointsCost: body.pointsCost as number,
      value: body.value as number | undefined, description: body.description as string | undefined,
      config: body.config as Record<string, unknown> | undefined, validityDays: body.validityDays as number | undefined,
      stock: body.stock as number | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ reward }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
