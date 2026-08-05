/**
 * Module 32 — Billing SaaS : moyens de paiement configurables (Super Admin).
 * GET  → liste (saas.providers)
 * POST → créer (saas.providers)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.providers");
    const type = new URL(req.url).searchParams.get("type") ?? undefined;
    const methods = await saasService.listPaymentMethods(type, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ methods });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.providers");
    const body = (await req.json()) as Record<string, unknown>;
    const method = await saasService.createPaymentMethod({
      methodKey: body.methodKey as string, name: body.name as string, type: body.type as never | undefined,
      countries: body.countries as string[] | undefined, currencies: body.currencies as string[] | undefined,
      plans: body.plans as string[] | undefined, hotelIds: body.hotelIds as string[] | undefined,
      config: body.config as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ method }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
