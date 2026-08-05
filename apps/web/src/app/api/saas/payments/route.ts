/**
 * Module 32 — Billing SaaS : paiements automatiques (Super Admin).
 * GET  → liste (saas.payments)
 * POST → débiter une facture via un connecteur (saas.payments)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.payments");
    const organisationId = new URL(req.url).searchParams.get("organisationId") ?? undefined;
    const payments = await saasService.listPayments(organisationId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ payments });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.payments");
    const body = (await req.json()) as Record<string, unknown>;
    const payment = await saasService.chargeInvoice(body.invoiceId as string, body.providerKey as string, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
