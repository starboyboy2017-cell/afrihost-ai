/**
 * Sous-module 33.1 — Bootstrap : création du premier Super Admin.
 * POST /api/bootstrap/init { email, password, bootstrapKey }
 * Sécurisé par la clé de bootstrap ; échoue si déjà initialisé.
 */
import { NextResponse } from "next/server";
import { bootstrapService } from "@/lib/di";
import { errorResponse } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const account = await bootstrapService.bootstrapFirstSuperAdmin({
      email: body.email as string, password: body.password as string,
      firstName: body.firstName as string | undefined, lastName: body.lastName as string | undefined,
      bootstrapKey: body.bootstrapKey as string,
    }, { organisationId: "platform", hotelId: "saas" });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
