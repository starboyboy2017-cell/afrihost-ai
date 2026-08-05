/**
 * Module 23 — Notifications : templates multilingues.
 * GET  → liste (notifications.view)
 * POST → créer (notifications.manage)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const templates = await notificationsService.listTemplates(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ templates });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const template = await notificationsService.createTemplate(ctx.hotelId, {
      channel: body.channel as never, eventType: body.eventType as never, code: body.code as string,
      locale: body.locale as string | undefined, subject: body.subject as string | undefined | null,
      body: body.body as string, variables: body.variables as string[] | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
