/**
 * Module 20 — Paiements & facturation : folios.
 * GET  /api/billing/folios?groupRef → liste (billing.folio)
 * POST /api/billing/folios          → créer (billing.folio)
 */
import { NextResponse } from "next/server";
import { billingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("billing.folio");
    const url = new URL(req.url);
    const folios = await billingService.listFolios(ctx.hotelId, url.searchParams.get("groupRef") ?? undefined, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ folios });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("billing.folio");
    const body = (await req.json()) as Record<string, unknown>;
    const folio = await billingService.createFolio(ctx.hotelId, {
      guestId: body.guestId as string, reservationId: body.reservationId as string | undefined,
      name: body.name as string | undefined, groupRef: body.groupRef as string | undefined,
      currency: body.currency as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ folio }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
