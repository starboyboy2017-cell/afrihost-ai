/**
 * Module 30 — API Publique : marketplace de connecteurs.
 * GET  → liste (publicapi.view)
 * POST → publier (publicapi.manage)
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.view");
    const publishedOnly = new URL(req.url).searchParams.get("published") !== "false";
    const apps = await publicApiService.listMarketplace(publishedOnly, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ apps });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const app = await publicApiService.publishMarketplace({
      appId: body.appId as string, name: body.name as string, category: body.category as string,
      summary: body.summary as string | undefined | null, iconUrl: body.iconUrl as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ app }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
