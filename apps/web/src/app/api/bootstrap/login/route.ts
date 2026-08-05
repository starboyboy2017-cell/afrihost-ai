/**
 * Sous-module 33.1 — Bootstrap : connexion d'un Super Admin.
 * POST /api/bootstrap/login { email, password, otp? }
 */
import { NextResponse } from "next/server";
import { bootstrapService } from "@/lib/di";
import { errorResponse } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const account = await bootstrapService.login({
      email: body.email as string, password: body.password as string, otp: body.otp as string | undefined | null,
    }, { organisationId: "platform", hotelId: "saas" });
    return NextResponse.json({ account });
  } catch (err) { return errorResponse(err); }
}
