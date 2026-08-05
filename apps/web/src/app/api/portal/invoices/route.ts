/**
 * Module 26 — Portail client : factures & reçus.
 * GET /api/portal/invoices?guestId= (portal.view_invoice)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.view_invoice");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const invoices = await portalService.invoices(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ invoices });
  } catch (err) { return errorResponse(err); }
}
