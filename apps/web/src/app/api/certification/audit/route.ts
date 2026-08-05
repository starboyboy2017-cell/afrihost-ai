/**
 * Module 35 — Certification : audit global.
 * GET /api/certification/audit (certification.audit)
 */
import { NextResponse } from "next/server";
import { certificationService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("certification.audit");
    const audit = await certificationService.auditGlobal({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ audit });
  } catch (err) { return errorResponse(err); }
}
