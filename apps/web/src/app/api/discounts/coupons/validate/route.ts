/**
 * Module 17 — Remises : validation & application d'un coupon.
 * POST /api/discounts/coupons/validate  body: { code, context }  (coupons.validate)
 *   context: { roleCode?, channel?, guestType?, roomTypeId?, amount, date? }
 */
import { NextResponse } from "next/server";
import { discountsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("coupons.validate");
    const body = (await req.json()) as { code?: string; context?: never };
    if (!body.code) return NextResponse.json({ error: "code requis" }, { status: 400 });
    const result = await discountsService.validateCoupon(ctx.hotelId, body.code, body.context ?? { amount: 0 }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
