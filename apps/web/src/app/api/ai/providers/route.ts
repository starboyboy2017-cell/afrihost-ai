/**
 * Module 24 — IA : fournisseurs LLM configurables.
 * GET  → liste (ai.view)
 * POST → créer (ai.manage)
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("ai.view");
    const providers = await aiService.listProviders(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ providers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const provider = await aiService.createProvider(ctx.hotelId, {
      name: body.name as string, providerKey: body.providerKey as string,
      baseUrl: body.baseUrl as string | undefined | null, model: body.model as string | undefined | null,
      credentials: body.credentials as Record<string, unknown> | undefined,
      config: body.config as Record<string, unknown> | undefined, isDefault: body.isDefault as boolean | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
