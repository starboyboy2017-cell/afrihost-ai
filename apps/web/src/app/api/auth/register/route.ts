/**
 * Authentification — inscription d'un nouvel hôtel.
 * POST /api/auth/register
 *   { organisationName, hotelName, city?, country?, email, password, firstName, lastName }
 * Crée : Organisation (trigger → rôles système), Hôtel, User, Membership (HOTEL_OWNER),
 * puis ouvre une session (cookie httpOnly). Idempotent par email.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, sessionCookieName } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const organisationName = (body.organisationName as string)?.trim();
    const hotelName = (body.hotelName as string)?.trim();
    const email = (body.email as string)?.trim().toLowerCase();
    const password = body.password as string;
    const firstName = (body.firstName as string)?.trim() ?? "Propriétaire";
    const lastName = (body.lastName as string)?.trim() ?? "Hôtel";
    const city = (body.city as string)?.trim() ?? null;
    const country = (body.country as string)?.trim() ?? null;

    if (!organisationName || !hotelName || !email || !password) {
      return NextResponse.json({ error: "Champs requis : organisationName, hotelName, email, password" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });

    const orgSlug = slugify(`${organisationName}-${Date.now().toString().slice(-4)}`);
    const hotelSlug = slugify(hotelName);
    const hotelCode = `HTL${Date.now().toString().slice(-5)}`;

    // Organisation (le trigger Postgres crée les rôles système).
    const org = await prisma.organisation.create({ data: { name: organisationName, slug: orgSlug, legalName: organisationName } });
    // Hôtel
    const hotel = await prisma.hotel.create({ data: { organisationId: org.id, name: hotelName, slug: hotelSlug, code: hotelCode, city, country } });
    // Utilisateur
    const user = await prisma.user.create({ data: { organisationId: org.id, email, passwordHash: hashPassword(password), firstName, lastName, isActive: true } });
    // Rôle HOTEL_OWNER (créé par le trigger à la création de l'org)
    const role = await prisma.role.findFirst({ where: { organisationId: org.id, name: "HOTEL_OWNER" } });
    // Membership (hôtel actif par défaut)
    await prisma.membership.create({ data: { userId: user.id, hotelId: hotel.id, roleId: role?.id ?? "", isDefault: true } });

    // Ouverture de session
    const token = createSessionToken(user.id, user.email);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 12 * 3600 });

    return NextResponse.json({
      ok: true,
      session: { userId: user.id, email: user.email, organisationId: org.id, hotelId: hotel.id },
    }, { status: 201 });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur interne" }, { status: 500 });
  }
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
