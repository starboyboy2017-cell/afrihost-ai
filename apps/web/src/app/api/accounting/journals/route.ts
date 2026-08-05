/**
 * Module 19 — Comptabilité : journaux.
 * GET  /api/accounting/journals → liste (accounting.view)
 * POST /api/accounting/journals → créer (accounting.manage)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("accounting.view");
    const journals = await accountingService.listJournals(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ journals });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.manage");
    const body = (await req.json()) as { name?: string; type?: string };
    const journal = await accountingService.createJournal(ctx.hotelId, body.name ?? "", body.type as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ journal }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
