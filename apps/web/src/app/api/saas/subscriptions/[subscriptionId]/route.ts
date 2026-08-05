/**
 * Module 32 — Billing SaaS : cycle de vie d'un abonnement (Super Admin).
 * POST /api/saas/subscriptions/:id (action: renew | suspend | reactivate | cancel)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { subscriptionId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("saas.subscriptions");
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action as string;
    let result: unknown = { ok: true };
    switch (action) {
      case "renew": result = { invoice: await saasService.renew(params.subscriptionId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId }) }; break;
      case "suspend": await saasService.suspend(params.subscriptionId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId }); break;
      case "reactivate": await saasService.reactivate(params.subscriptionId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId }); break;
      case "cancel": await saasService.cancel(params.subscriptionId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId }); break;
      default: return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
