/**
 * Module 29 — Administration : configuration dynamique.
 * GET  /api/admin/config?category=&scope= → liste (admin.view)
 * POST /api/admin/config → définir (admin.manage / admin.saas)
 */
import { NextResponse } from "next/server";
import type { AdminCategory, ConfigValue } from "@afrihost/domain";
import { adminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("admin.view");
    const url = new URL(req.url);
    const scope = (url.searchParams.get("scope") ?? "HOTEL") as "SAAS" | "HOTEL";
    const configs = await adminService.listConfigs(ctx.hotelId, {
      category: (url.searchParams.get("category") ?? undefined) as AdminCategory | undefined, scope, hotelId: ctx.hotelId,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ configs });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("admin.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const scope = body.scope === "SAAS" ? "SAAS" : "HOTEL";
    // Config SaaS globale requiert une permission plateforme.
    if (scope === "SAAS") await requireAuthAndPermission("admin.saas");
    const config = await adminService.setConfig(ctx.hotelId, {
      category: body.category as AdminCategory, key: body.key as string, value: body.value as ConfigValue,
      scope, hotelId: ctx.hotelId,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ config }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
