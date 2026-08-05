/**
 * Module 30 — API Publique : credentials (API Key / OAuth2 / JWT).
 * GET  → liste (publicapi.view)
 * POST → générer (publicapi.manage) — renvoie le secret UNE seule fois
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { appId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.view");
    const credentials = await publicApiService.listCredentials(params.appId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ credentials });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const result = await publicApiService.createCredential(params.appId, {
      kind: body.kind as never | undefined, scopes: body.scopes as string[] | undefined,
      hotels: body.hotels as string[] | undefined, rateLimitPerMinute: body.rateLimitPerMinute as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
