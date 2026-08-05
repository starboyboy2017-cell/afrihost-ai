/**
 * Module 34 — DevOps : incidents de sécurité.
 * GET  → liste (devops.security)
 * POST → signaler (devops.security)
 */
import { NextResponse } from "next/server";
import { devopsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("devops.security");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const incidents = await devopsService.listIncidents(status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ incidents });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("devops.security");
    const body = (await req.json()) as Record<string, unknown>;
    const incident = await devopsService.reportIncident({
      type: body.type as string, severity: body.severity as never | undefined,
      source: body.source as string | undefined | null, detail: body.detail as string | undefined | null,
      ip: body.ip as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ incident }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
