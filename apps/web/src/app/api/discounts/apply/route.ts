/**
 * Module 17 — Remises : application d'une règle.
 * POST /api/discounts/apply  body: { ruleId, context }  (discounts.apply)
 */
import { NextResponse } from "next/server";
import { discountsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("discounts.apply");
    const body = (await req.json()) as { ruleId?: string; context?: never };
    if (!body.ruleId) return NextResponse.json({ error: "ruleId requis" }, { status: 400 });
    const result = await discountsService.applyRule(ctx.hotelId, body.ruleId, body.context ?? { amount: 0 }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
