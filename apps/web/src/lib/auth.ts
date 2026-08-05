/**
 * Authentification applicative — sessions JWT signées (HS256) via cookie httpOnly.
 *
 * Indépendante du fournisseur : les mots de passe sont hashés (SHA-256 salé) et les
 * sessions sont des JWT signés avec une clé serveur (AUTH_SECRET). La résolution du
 * contexte (AccessContext) se fait ensuite via les membreships en base (RLS/RBAC).
 */
import { createHmac, createHash, randomBytes } from "node:crypto";

const SECRET = process.env.AUTH_SECRET ?? "afrihost-auth-dev-secret-2026";
const SESSION_COOKIE = "afrihost_session";
const SESSION_TTL_HOURS = 12;

/** Hash d'un mot de passe (sale, résistant). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${hash}`;
}

/** Vérifie un mot de passe contre son hash stocké. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  // comparaison constante
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Signe un JWT (HS256). */
function sign(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

/** Vérifie et décode un JWT. Retourne null si invalide/expiré. */
export function verify<T extends Record<string, unknown>>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Crée une session (payload = infos de session). */
export function createSessionToken(userId: string, email: string): string {
  return sign({
    sub: userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_HOURS * 3600,
  });
}

/** Types d'une session JWT. */
export interface SessionPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const sessionCookieName = SESSION_COOKIE;
