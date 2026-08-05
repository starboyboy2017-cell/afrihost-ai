/**
 * Module 34 — DevOps : rotation des secrets.
 * GET  → historique (devops.secrets)
 * POST → effectuer une rotation (devops.secrets)
 */
import { NextResponse } from "next/server";
import { devopsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("devops.secrets");
    const rotations = await devopsService.listSecretRotations({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rotations });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("devops.secrets");
    const body = (await req.json()) as Record<string, unknown>;
    const rotation = await devopsService.rotateSecret({
      secretKey: body.secretKey as string, provider: body.provider as string | undefined | null,
      reason: body.reason as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ rotation }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
