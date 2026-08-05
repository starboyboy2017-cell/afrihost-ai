/**
 * Module 24 — IA : recommandations personnalisées.
 * GET  /api/ai/recommendations?guestId= → liste (ai.view)
 * POST → créer (ai.automation)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? undefined;
    const recommendations = await aiService.listRecommendations(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ recommendations });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.automation");
    const body = (await req.json()) as Record<string, unknown>;
    const recommendation = await aiService.recommend(ctx.hotelId, body.guestId as string, body.kind as string, body.title as string, (body.score as number) ?? 0.5, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
