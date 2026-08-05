/**
 * Module 24 — IA : suggestions opérationnelles.
 * GET  /api/ai/suggestions?kind= → liste (ai.view)
 * POST /api/ai/suggestions → générer à partir de données autorisées (ai.automation)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const kind = new URL(req.url).searchParams.get("kind") ?? undefined;
    const suggestions = await aiService.listSuggestions(ctx.hotelId, kind, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ suggestions });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.automation");
    const body = (await req.json()) as Record<string, unknown>;
    const suggestions = await aiService.generateSuggestions(ctx.hotelId, (body.data as Record<string, unknown>) as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ suggestions }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
