/**
 * Module 16 — Pourboires : règles de répartition configurables par hôtel.
 * GET  /api/tips/rules → liste (tips.view)
 * POST /api/tips/rules → créer (tips.rules_manage)
 */
import { NextResponse } from "next/server";
import { tipsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("tips.view");
    const rules = await tipsService.listRules(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rules });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("tips.rules_manage");
    const body = (await req.json()) as Record<string, unknown>;
    const rule = await tipsService.createRule(ctx.hotelId, {
      name: body.name as string, serverPercent: body.serverPercent as number | undefined,
      teamPercent: body.teamPercent as number | undefined, kitchenPercent: body.kitchenPercent as number | undefined,
      otherPercent: body.otherPercent as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
