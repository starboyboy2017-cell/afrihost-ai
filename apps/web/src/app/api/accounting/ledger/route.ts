/**
 * Module 19 — Comptabilité : grand livre.
 * GET /api/accounting/ledger?accountId → grand livre (accounting.view)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.view");
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    if (!accountId) return NextResponse.json({ error: "accountId requis" }, { status: 400 });
    const ledger = await accountingService.ledger(ctx.hotelId, accountId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ledger });
  } catch (err) { return errorResponse(err); }
}
