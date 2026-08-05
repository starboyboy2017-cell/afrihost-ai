/**
 * Authentification — déconnexion.
 * POST /api/auth/logout
 * Efface le cookie de session.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
