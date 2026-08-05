/**
 * Module 21 — CRM : interactions client.
 * POST /api/crm/interactions  body: { guestId, type, summary, detail?, sourceModule? }  (crm.manage)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const interaction = await crmService.recordInteraction(ctx.hotelId, {
      guestId: body.guestId as string, type: body.type as string, summary: body.summary as string,
      detail: body.detail as never, sourceModule: body.sourceModule as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ interaction }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
