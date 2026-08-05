/**
 * Module 22 — Fidélité : règles d'attribution (moteur paramétrable).
 * GET  → liste (loyalty.view)
 * POST → créer (loyalty.manage)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const rules = await loyaltyService.listRules(ctx.hotelId, params.programId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rules });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request, { params }: { params: { programId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const rule = await loyaltyService.createRule(ctx.hotelId, params.programId, {
      name: body.name as string, trigger: body.trigger as never, condition: body.condition as Record<string, unknown> | undefined,
      points: body.points as number | undefined, pointsPerUnit: body.pointsPerUnit as number | undefined,
      multiplier: body.multiplier as number | undefined, capPerEvent: body.capPerEvent as number | undefined | null,
      priority: body.priority as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
