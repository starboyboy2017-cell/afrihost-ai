/**
 * Module 23 — Notifications : fournisseurs configurables.
 * GET  /api/notifications/providers → liste (notifications.view)
 * POST /api/notifications/providers → créer (notifications.manage)
 */
import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("notifications.view");
    const providers = await notificationsService.listProviders(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ providers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("notifications.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const provider = await notificationsService.createProvider(ctx.hotelId, {
      name: body.name as string, channel: body.channel as never, providerType: body.providerType as never,
      providerKey: body.providerKey as string, credentials: body.credentials as Record<string, unknown> | undefined,
      config: body.config as Record<string, unknown> | undefined, fromAddress: body.fromAddress as string | undefined | null,
      domain: body.domain as string | undefined | null, replyTo: body.replyTo as string | undefined | null,
      isDefault: body.isDefault as boolean | undefined, rateLimitPerMinute: body.rateLimitPerMinute as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
