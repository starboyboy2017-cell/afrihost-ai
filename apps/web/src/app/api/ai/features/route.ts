/**
 * Module 24 — IA : configuration des fonctionnalités par hôtel.
 * GET  → liste (ai.view)
 * POST → activer/désactiver (ai.manage)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const features = await aiService.listFeatures(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ features });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const feature = await aiService.setFeature(ctx.hotelId, {
      feature: body.feature as string, isEnabled: body.isEnabled as boolean,
      config: body.config as Record<string, unknown> | undefined, quotaPerDay: body.quotaPerDay as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ feature });
  } catch (err) { return errorResponse(err); }
}
