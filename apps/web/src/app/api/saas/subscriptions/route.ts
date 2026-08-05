/**
 * Module 32 — Billing SaaS : abonnements (Super Administration).
 * GET  → liste (saas.subscriptions)
 * POST → créer (saas.subscriptions)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.subscriptions");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const subscriptions = await saasService.listSubscriptions(status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ subscriptions });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.subscriptions");
    const body = (await req.json()) as Record<string, unknown>;
    const subscription = await saasService.createSubscription({
      organisationId: body.organisationId as string, hotelId: body.hotelId as string | undefined | null,
      planCode: body.planCode as string, billingCycle: body.billingCycle as string | undefined,
      couponCode: body.couponCode as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
