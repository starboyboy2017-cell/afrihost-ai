/**
 * Module 20 — Folios : facturation consolidée.
 * POST /api/billing/folios/:id/consolidate  (billing.consolidate)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { folioId: string } };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("billing.consolidate");
    const invoice = await billingService.consolidate(ctx.hotelId, params.folioId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
