/**
 * Module 16 — Pourboires : transitions de statut.
 * POST /api/tips/:id/status  body: { action: "validate"|"distribute"|"cancel", reason? }
 *   validate → tips.validate ; distribute → tips.distribute ; cancel → tips.cancel
 */
import { NextResponse } from "next/server";
import { tipsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { tipId: string } };

const PERM: Record<string, "tips.validate" | "tips.distribute" | "tips.cancel"> = {
  validate: "tips.validate",
  distribute: "tips.distribute",
  cancel: "tips.cancel",
};

export async function POST(req: Request, { params }: Ctx) {
  try {
    const body = (await req.json()) as { action?: string; reason?: string };
    const perm = PERM[body.action ?? ""];
    if (!perm) return NextResponse.json({ error: "action inconnue (validate|distribute|cancel)" }, { status: 400 });
    const ctx = await requireAuthAndPermission(perm);
    const actor = { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId };

    let tip;
    if (body.action === "validate") tip = await tipsService.validate(ctx.hotelId, params.tipId, actor);
    else if (body.action === "distribute") tip = await tipsService.distribute(ctx.hotelId, params.tipId, actor);
    else tip = await tipsService.cancel(ctx.hotelId, params.tipId, actor, body.reason);
    return NextResponse.json({ tip });
  } catch (err) { return errorResponse(err); }
}
