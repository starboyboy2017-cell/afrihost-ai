/**
 * Module 24 — IA : assistant conversationnel / recherche.
 * POST /api/ai/assistant (ai.assistant)
 * Le `context` doit contenir UNIQUEMENT des données déjà filtrées par RBAC/RLS.
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.assistant");
    const body = (await req.json()) as Record<string, unknown>;
    const result = await aiService.assistant(ctx.hotelId, {
      feature: body.feature as string, prompt: body.prompt as string,
      context: body.context as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ result });
  } catch (err) { return errorResponse(err); }
}
