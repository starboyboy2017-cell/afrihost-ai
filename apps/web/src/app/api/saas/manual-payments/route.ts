/**
 * Module 32 — Billing SaaS : paiements manuels (Super Admin).
 * GET  → liste (saas.payments)
 * POST → déposer un paiement avec preuve (saas.payments)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.payments");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const payments = await saasService.listManualPayments(status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ payments });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.payments");
    const body = (await req.json()) as Record<string, unknown>;
    const payment = await saasService.createManualPayment({
      organisationId: body.organisationId as string, hotelId: body.hotelId as string | undefined | null,
      subscriptionId: body.subscriptionId as string, methodKey: body.methodKey as string,
      amount: body.amount as number, currency: body.currency as string,
      proofType: body.proofType as string | undefined | null, proofUrl: body.proofUrl as string | undefined | null,
      bankRef: body.bankRef as string | undefined | null, comment: body.comment as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
