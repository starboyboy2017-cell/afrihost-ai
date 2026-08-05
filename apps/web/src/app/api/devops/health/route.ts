/**
 * Module 34 — DevOps : Health Dashboard.
 * GET  → état global (devops.health)
 * POST → exécuter un check (devops.health)
 */
import { NextResponse } from "next/server";
import { devopsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("devops.health");
    const health = await devopsService.healthDashboard({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ health });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("devops.health");
    const body = (await req.json()) as Record<string, unknown>;
    const check = await devopsService.runHealthCheck({
      component: body.component as string, status: body.status as never | undefined,
      latencyMs: body.latencyMs as number | undefined | null, region: body.region as string | undefined | null,
      detail: body.detail as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ check }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
