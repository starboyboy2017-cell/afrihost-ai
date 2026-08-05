/**
 * Sous-module 33.1 — Bootstrap : changement de mot de passe (première connexion).
 * POST /api/bootstrap/change-password { superAdminId, currentPassword, newPassword }
 */
import { NextResponse } from "next/server";
import { bootstrapService } from "@/lib/di";
import { errorResponse } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    await bootstrapService.changePassword(body.superAdminId as string, {
      currentPassword: body.currentPassword as string, newPassword: body.newPassword as string,
    }, { organisationId: "platform", hotelId: "saas" });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
