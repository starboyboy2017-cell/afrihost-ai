/**
 * Module 19 — Comptabilité : balance.
 * GET /api/accounting/balance?periodId → balance (accounting.view)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.view");
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId") ?? "";
    const balance = await accountingService.trialBalance(ctx.hotelId, periodId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ balance });
  } catch (err) { return errorResponse(err); }
}
