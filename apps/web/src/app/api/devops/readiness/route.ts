/**
 * Module 34 — DevOps : rapport de préparation à la production.
 * GET /api/devops/readiness (devops.report)
 */
import { NextResponse } from "next/server";
import { devopsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("devops.report");
    const report = await devopsService.productionReadiness({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ report });
  } catch (err) { return errorResponse(err); }
}
