/**
 * Module 19 — Comptabilité : écritures.
 * POST /api/accounting/entries  body: { journalId, periodId?, entryDate, reference, label, lines }  (accounting.post)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.post");
    const body = (await req.json()) as Record<string, unknown>;
    const entry = await accountingService.createEntry(ctx.hotelId, {
      journalId: body.journalId as string,
      periodId: body.periodId as string | undefined,
      entryDate: body.entryDate as string,
      reference: body.reference as string,
      label: body.label as string,
      lines: body.lines as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
