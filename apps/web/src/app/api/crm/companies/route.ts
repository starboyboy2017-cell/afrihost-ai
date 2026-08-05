/**
 * Module 21 — CRM : entreprises / agences.
 * GET  /api/crm/companies → liste (crm.view)
 * POST /api/crm/companies → créer (crm.manage)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("crm.view");
    const companies = await crmService.listCompanies(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ companies });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const company = await crmService.createCompany(ctx.hotelId, {
      name: body.name as string, type: body.type as string, contact: body.contact as string | undefined,
      email: body.email as string | undefined, phone: body.phone as string | undefined, address: body.address as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
