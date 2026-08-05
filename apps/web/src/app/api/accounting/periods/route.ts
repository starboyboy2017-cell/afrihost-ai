/**
 * Module 19 — Comptabilité : périodes comptables.
 * GET  /api/accounting/periods → liste (accounting.view)
 * POST /api/accounting/periods → créer (accounting.period)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("accounting.view");
    const periods = await accountingService.listPeriods(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ periods });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.period");
    const body = (await req.json()) as Record<string, unknown>;
    const period = await accountingService.createPeriod(ctx.hotelId, {
      label: body.label as string, startDate: body.startDate as string, endDate: body.endDate as string,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ period }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
