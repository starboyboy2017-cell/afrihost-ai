/**
 * Module 24 — IA : alertes intelligentes sur anomalies.
 * GET  /api/ai/alerts?status= → liste (ai.view)
 * POST /api/ai/alerts → détecter via règles (ai.automation)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const alerts = await aiService.listAlerts(ctx.hotelId, status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ alerts });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.automation");
    const body = (await req.json()) as Record<string, unknown>;
    const alerts = await aiService.runAlerts(ctx.hotelId, (body.data as Record<string, unknown>) as never, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ alerts }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
