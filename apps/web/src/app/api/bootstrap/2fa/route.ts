/**
 * Sous-module 33.1 — Bootstrap : activation du 2FA.
 * POST /api/bootstrap/2fa/generate { superAdminId } → secret
 * POST /api/bootstrap/2fa/enable { superAdminId, code, secret }
 * POST /api/bootstrap/2fa/disable { superAdminId }
 */
import { NextResponse } from "next/server";
import { bootstrapService } from "@/lib/di";
import { errorResponse } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action as string;
    const actor = { organisationId: "platform", hotelId: "saas" };
    let result: unknown = { ok: true };
    if (action === "generate") {
      result = await bootstrapService.generate2FASecret(body.superAdminId as string, actor);
    } else if (action === "enable") {
      await bootstrapService.enable2FA(body.superAdminId as string, { code: body.code as string, secret: body.secret as string }, actor);
    } else if (action === "disable") {
      await bootstrapService.disable2FA(body.superAdminId as string, actor);
    } else {
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
