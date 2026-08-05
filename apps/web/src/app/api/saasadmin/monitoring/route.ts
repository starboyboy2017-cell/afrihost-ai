/**
 * Module 33 — Super Admin : monitoring.
 * GET  → liste (saasadmin.monitoring)
 * POST → exécuter un check (saasadmin.monitoring)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.monitoring");
    const target = new URL(req.url).searchParams.get("target") ?? undefined;
    const checks = await saasAdminService.listMonitorChecks(target, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ checks });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.monitoring");
    const body = (await req.json()) as Record<string, unknown>;
    const check = await saasAdminService.runMonitorCheck({
      target: body.target as string, name: body.name as string, status: body.status as never | undefined,
      latencyMs: body.latencyMs as number | undefined | null, detail: body.detail as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ check }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
