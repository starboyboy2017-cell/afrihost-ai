/**
 * Authentification — connexion.
 * POST /api/auth/login { email, password }
 * Vérifie les identifiants, ouvre une session (cookie httpOnly).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, sessionCookieName } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = (body.email as string)?.trim().toLowerCase();
    const password = body.password as string;
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !user.isActive) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }
    const token = createSessionToken(user.id, user.email);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 12 * 3600 });

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
