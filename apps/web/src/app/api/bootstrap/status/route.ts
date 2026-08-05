/**
 * Sous-module 33.1 — Bootstrap : état d'initialisation du SaaS.
 * GET /api/bootstrap/status (public, pas d'auth — nécessaire avant le bootstrap)
 */
import { NextResponse } from "next/server";
import { bootstrapService } from "@/lib/di";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const initialized = await bootstrapService.isInitialized({ organisationId: "platform", hotelId: "saas" });
    return NextResponse.json({ initialized });
  } catch (err) { return errorResponse(err); }
}
