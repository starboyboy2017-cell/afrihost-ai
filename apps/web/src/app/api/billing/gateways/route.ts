/**
 * Module 20 — Passerelles de paiement configurables (Stripe, Flutterwave, etc.).
 * GET  /api/billing/gateways → liste (billing.folio)
 * POST /api/billing/gateways → créer (billing.folio)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("billing.folio");
    const gateways = await billingService.listGateways(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ gateways });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("billing.folio");
    const body = (await req.json()) as Record<string, unknown>;
    const gateway = await billingService.createGateway(ctx.hotelId, { name: body.name as string, provider: body.provider as string, config: body.config as never }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ gateway }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
