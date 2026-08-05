/**
 * Module 32 — Billing SaaS : factures (Super Administration).
 * GET /api/saas/invoices?organisationId=&status= (saas.billing)
 */
import { NextResponse } from "next/server";
import { saasService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saas.billing");
    const url = new URL(req.url);
    const invoices = await saasService.listInvoices(url.searchParams.get("organisationId") ?? undefined, url.searchParams.get("status") ?? undefined, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ invoices });
  } catch (err) { return errorResponse(err); }
}
