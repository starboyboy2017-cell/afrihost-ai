/**
 * Module 19 — Comptabilité : rapprochement bancaire.
 * POST /api/accounting/reconcile  body: { bankAccount, statementDate, bankBalance }  (accounting.reconcile)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.reconcile");
    const body = (await req.json()) as Record<string, unknown>;
    const result = await accountingService.reconcile(ctx.hotelId, {
      bankAccount: body.bankAccount as string,
      statementDate: body.statementDate as string,
      bankBalance: body.bankBalance as number,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
