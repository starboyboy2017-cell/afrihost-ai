/**
 * Module 21 — CRM : préférences client.
 * POST /api/crm/preferences  body: { guestId, language?, roomTypeId?, ..., custom? }  (crm.manage)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const preference = await crmService.savePreference(ctx.hotelId, body as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ preference }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
