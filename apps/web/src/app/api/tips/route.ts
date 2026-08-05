/**
 * Module 16 — Pourboires : enregistrement & suivi.
 * GET  /api/tips?status&type → suivi (montants en attente/distribués) (tips.view)
 * POST /api/tips              → enregistrer un pourboire (tips.create)
 */
import { NextResponse } from "next/server";
import { tipsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("tips.view");
    const url = new URL(req.url);
    const result = await tipsService.listTips(ctx.hotelId, {
      status: (url.searchParams.get("status") ?? undefined) as never,
      type: (url.searchParams.get("type") ?? undefined) as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("tips.create");
    const body = (await req.json()) as Record<string, unknown>;
    const tip = await tipsService.recordTip(ctx.hotelId, {
      posPaymentId: body.posPaymentId as string | undefined,
      posOrderId: body.posOrderId as string | undefined,
      type: body.type as never,
      amount: body.amount as number,
      method: body.method as never,
      recipient: body.recipient as string | undefined,
      tipRuleId: body.tipRuleId as string | undefined,
      note: body.note as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ tip }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
