/**
 * Module 35 — Certification : statistiques de plateforme.
 * GET /api/certification/stats (certification.audit)
 */
import { NextResponse } from "next/server";
import { certificationService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("certification.audit");
    const stats = await certificationService.platformStats({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ stats });
  } catch (err) { return errorResponse(err); }
}
