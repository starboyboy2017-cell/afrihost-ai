/**
 * Module 19 — Comptabilité : centres de coûts.
 * GET  /api/accounting/cost-centers → liste (accounting.view)
 * POST /api/accounting/cost-centers → créer (accounting.manage)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("accounting.view");
    const costCenters = await accountingService.listCostCenters(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ costCenters });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.manage");
    const body = (await req.json()) as { name?: string; code?: string };
    const costCenter = await accountingService.createCostCenter(ctx.hotelId, body.name ?? "", body.code ?? "", { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ costCenter }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
