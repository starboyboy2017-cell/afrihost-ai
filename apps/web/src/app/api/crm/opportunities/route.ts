/**
 * Module 21 — CRM : opportunités.
 * GET  /api/crm/opportunities?companyId → liste (crm.view)
 * POST /api/crm/opportunities            → créer (crm.manage)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.view");
    const url = new URL(req.url);
    const opportunities = await crmService.listOpportunities(ctx.hotelId, url.searchParams.get("companyId") ?? undefined, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ opportunities });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const opportunity = await crmService.createOpportunity(ctx.hotelId, {
      guestId: body.guestId as string | undefined, companyId: body.companyId as string | undefined,
      title: body.title as string, value: body.value as number | undefined, stage: body.stage as string | undefined,
      expectedDate: body.expectedDate as string | undefined, notes: body.notes as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
