/**
 * Module 21 — CRM : segments.
 * GET  /api/crm/segments → liste (crm.view)
 * POST /api/crm/segments → créer (crm.segments)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("crm.view");
    const segments = await crmService.listSegments(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ segments });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.segments");
    const body = (await req.json()) as Record<string, unknown>;
    const segment = await crmService.createSegment(ctx.hotelId, { name: body.name as string, description: body.description as string | undefined, criteria: body.criteria as never }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ segment }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
