/**
 * Module 20 — Folios : paiements multimoyens.
 * POST /api/billing/folios/:id/payments  body: { amount, method, kind?, invoiceId?, gatewayId?, reference? }  (payments.create)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { folioId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("payments.create");
    const body = (await req.json()) as Record<string, unknown>;
    await billingService.pay(ctx.hotelId, {
      folioId: params.folioId, amount: body.amount as number, method: body.method as never,
      kind: body.kind as never, invoiceId: body.invoiceId as string | undefined,
      gatewayId: body.gatewayId as string | undefined, reference: body.reference as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
