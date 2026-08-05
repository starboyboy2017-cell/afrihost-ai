/**
 * Module 32 — Billing SaaS : coupons / promotions (Super Admin).
 * POST /api/saas/coupons (saas.providers)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.providers");
    const body = (await req.json()) as Record<string, unknown>;
    const coupon = await saasService.createCoupon({
      code: body.code as string, type: body.type as never | undefined, value: body.value as number,
      maxUses: body.maxUses as number | undefined | null, planCodes: body.planCodes as string[] | undefined,
      expiresAt: body.expiresAt as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
