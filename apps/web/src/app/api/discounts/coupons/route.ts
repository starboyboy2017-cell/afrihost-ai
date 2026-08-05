/**
 * Module 17 — Remises : génération de coupons.
 * POST /api/discounts/coupons  body: { ruleId, singleUse?, expiresAt?, issuedTo? }  (coupons.generate)
 */
import { NextResponse } from "next/server";
import { discountsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("coupons.generate");
    const body = (await req.json()) as Record<string, unknown>;
    const coupon = await discountsService.generateCoupon(ctx.hotelId, {
      ruleId: body.ruleId as string, singleUse: body.singleUse as boolean | undefined,
      expiresAt: body.expiresAt as string | undefined, issuedTo: body.issuedTo as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
