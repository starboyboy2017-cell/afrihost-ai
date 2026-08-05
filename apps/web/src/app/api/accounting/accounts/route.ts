/**
 * Module 19 — Comptabilité : plan comptable.
 * GET  /api/accounting/accounts → liste (accounting.view)
 * POST /api/accounting/accounts → créer (accounting.manage)
 */
import { NextResponse } from "next/server";
import { accountingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("accounting.view");
    const accounts = await accountingService.listAccounts(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ accounts });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("accounting.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const account = await accountingService.createAccount(ctx.hotelId, {
      code: body.code as string, name: body.name as string, type: body.type as never, nature: body.nature as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
