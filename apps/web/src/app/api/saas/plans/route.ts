/**
 * Module 32 — Billing SaaS : plans (Super Administration uniquement).
 * GET  → liste (saas.plans)
 * POST → créer (saas.plans)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.plans");
    const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "true";
    const plans = await saasService.listPlans(includeInactive, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ plans });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.plans");
    const body = (await req.json()) as Record<string, unknown>;
    const plan = await saasService.createPlan({
      code: body.code as string, name: body.name as string, description: body.description as string | undefined | null,
      price: body.price as number | undefined, currency: body.currency as string | undefined,
      billingCycle: body.billingCycle as never | undefined, trialDays: body.trialDays as number | undefined,
      maxUsers: body.maxUsers as number | undefined, maxHotels: body.maxHotels as number | undefined, maxRooms: body.maxRooms as number | undefined,
      quotaAi: body.quotaAi as number | undefined, quotaEmail: body.quotaEmail as number | undefined,
      quotaSms: body.quotaSms as number | undefined, quotaWhatsapp: body.quotaWhatsapp as number | undefined, quotaApi: body.quotaApi as number | undefined,
      modules: body.modules as string[] | undefined, features: body.features as Record<string, unknown> | undefined,
      allowedPaymentMethods: body.allowedPaymentMethods as string[] | undefined, allowedCountries: body.allowedCountries as string[] | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
