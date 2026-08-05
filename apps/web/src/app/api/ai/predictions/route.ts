/**
 * Module 24 — IA : prédictions (occupation, revenus, demande, surcharge, stock).
 * GET  → liste (ai.view)
 * POST → prédire à partir d'une série temporelle (ai.automation)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const metric = new URL(req.url).searchParams.get("metric") ?? undefined;
    const predictions = await aiService.listPredictions(ctx.hotelId, metric, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ predictions });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.automation");
    const body = (await req.json()) as Record<string, unknown>;
    const prediction = await aiService.predict(ctx.hotelId, body.metric as string, (body.values as number[]) ?? [], body.horizon as string ?? "week", new Date(), new Date(), { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ prediction }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
