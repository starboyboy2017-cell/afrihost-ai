/**
 * Module 24 — IA : journal des requêtes.
 * GET /api/ai/requests?feature= → liste (ai.view)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const feature = new URL(req.url).searchParams.get("feature") ?? undefined;
    const requests = await aiService.listRequests(ctx.hotelId, feature, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ requests });
  } catch (err) { return errorResponse(err); }
}
