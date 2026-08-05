/**
 * Module 20 — Folios : lignes de frais.
 * POST /api/billing/folios/:id/lines  body: { chargeType, description, quantity?, unitPrice, taxRate?, sourceRef? }  (billing.folio)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { folioId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("billing.folio");
    const body = (await req.json()) as Record<string, unknown>;
    const line = await billingService.addLine(ctx.hotelId, {
      folioId: params.folioId, chargeType: body.chargeType as never, description: body.description as string,
      quantity: body.quantity as number | undefined, unitPrice: body.unitPrice as number,
      taxRate: body.taxRate as number | undefined, sourceRef: body.sourceRef as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ line }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
