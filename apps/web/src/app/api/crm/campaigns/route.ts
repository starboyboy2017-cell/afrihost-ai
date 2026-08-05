/**
 * Module 21 — CRM : campagnes marketing.
 * GET  /api/crm/campaigns → liste (crm.view)
 * POST /api/crm/campaigns → créer/planifier (crm.campaigns)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("crm.view");
    const campaigns = await crmService.listCampaigns(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ campaigns });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.campaigns");
    const body = (await req.json()) as Record<string, unknown>;
    const campaign = await crmService.createCampaign(ctx.hotelId, {
      name: body.name as string, channel: body.channel as never, segmentId: body.segmentId as string | undefined,
      subject: body.subject as string | undefined, messageTemplate: body.messageTemplate as string,
      scheduledAt: body.scheduledAt as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
