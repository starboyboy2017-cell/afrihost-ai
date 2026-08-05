/**
 * Module 33 — Super Admin : licences SaaS.
 * GET  → liste (saasadmin.licenses)
 * POST → créer (saasadmin.licenses)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.licenses");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const licenses = await saasAdminService.listLicenses(status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ licenses });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.licenses");
    const body = (await req.json()) as Record<string, unknown>;
    const license = await saasAdminService.createLicense(body.organisationId as string, {
      subscriptionId: body.subscriptionId as string | undefined | null,
      expiresAt: body.expiresAt as string | undefined | null ? new Date(body.expiresAt as string) : null,
      quotas: (body.quotas as { ai: number; email: number; sms: number; whatsapp: number; api: number }) ?? { ai: 0, email: 0, sms: 0, whatsapp: 0, api: 0 },
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ license }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
