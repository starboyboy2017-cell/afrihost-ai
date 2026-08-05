/**
 * Module 30 — API Publique : authentification (OAuth2 / API Key / JWT).
 * POST /api/publicapi/auth { clientId, secret } → token context
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.view");
    const body = (await req.json()) as Record<string, unknown>;
    const auth = await publicApiService.authenticate(body.clientId as string, body.secret as string, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ auth });
  } catch (err) { return errorResponse(err); }
}
