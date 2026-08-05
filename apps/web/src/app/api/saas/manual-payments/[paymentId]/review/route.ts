/**
 * Module 32 — Billing SaaS : validation d'un paiement manuel (Super Admin).
 * POST /api/saas/manual-payments/:id/review { decision: APPROVE|REJECT|NEEDS_PROOF, comment }
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { paymentId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("saas.payments");
    const body = (await req.json()) as Record<string, unknown>;
    await saasService.reviewManualPayment(params.paymentId, {
      decision: body.decision as never, comment: body.comment as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
