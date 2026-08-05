/**
 * Module 35 — Certification : simulation du parcours SaaS.
 * GET /api/certification/journey (certification.audit)
 */
import { NextResponse } from "next/server";
import { certificationService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("certification.audit");
    const journey = await certificationService.simulateSaasJourney({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ journey });
  } catch (err) { return errorResponse(err); }
}
