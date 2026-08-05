/**
 * Module 30 — API Publique : applications tierces.
 * GET  → liste (publicapi.view)
 * POST → créer (publicapi.manage)
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("publicapi.view");
    const apps = await publicApiService.listApps({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ apps });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const app = await publicApiService.createApp({
      name: body.name as string, description: body.description as string | undefined | null,
      environment: body.environment as "SANDBOX" | "PRODUCTION" | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ app }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
