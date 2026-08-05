/**
 * Module 30 — API Publique : webhooks.
 * GET  → liste (publicapi.view)
 * POST → enregistrer (publicapi.manage)
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.view");
    const appId = new URL(req.url).searchParams.get("appId") ?? "";
    const webhooks = await publicApiService.listWebhooks(appId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ webhooks });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const webhook = await publicApiService.registerWebhook({
      appId: body.appId as string, hotelId: body.hotelId as string | undefined | null,
      url: body.url as string, events: (body.events as string[]) ?? [],
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
