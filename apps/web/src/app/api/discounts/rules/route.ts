/**
 * Module 17 — Remises : règles.
 * GET  /api/discounts/rules?scope → liste (discounts.view)
 * POST /api/discounts/rules       → créer (discounts.manage)
 */
import { NextResponse } from "next/server";
import { discountsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("discounts.view");
    const url = new URL(req.url);
    const rules = await discountsService.listRules(ctx.hotelId, (url.searchParams.get("scope") ?? undefined) as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rules });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("discounts.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const rule = await discountsService.createRule(ctx.hotelId, {
      name: body.name as string, code: body.code as string | undefined, type: body.type as never,
      value: body.value as number, scope: body.scope as never, roleCap: body.roleCap as number | undefined,
      conditions: body.conditions as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
