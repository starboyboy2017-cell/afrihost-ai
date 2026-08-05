/**
 * Module 35 — Certification : rapport de certification final.
 * GET /api/certification/certify (certification.certify)
 */
import { NextResponse } from "next/server";
import { certificationService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("certification.certify");
    const report = await certificationService.certify({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ report });
  } catch (err) { return errorResponse(err); }
}
