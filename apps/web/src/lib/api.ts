/**
 * Helpers API : résolution du contexte d'accès + réponse d'erreur normalisée.
 * Conformité BusinessRules BR-1 : RBAC vérifié sur chaque route via requirePermission.
 */
import { NextResponse } from "next/server";
import {
  AuthorizationService,
  requirePermission,
  UnauthorizedError,
  ForbiddenError,
  type AccessContext,
  type PermissionCode,
} from "@afrihost/core";
import { resolveAccessContext } from "./context";
import { ZodError } from "zod";

export type { PermissionCode };

const authorization = new AuthorizationService();

/**
 * Résout le contexte d'accès de la requête. Retourne null si non authentifié.
 * (Branchement réel sur Supabase Auth au Module 3 — IAM.)
 */
export async function getAuthContext(): Promise<AccessContext | null> {
  return resolveAccessContext(null);
}

/** Autorise une action : exige auth + permission, retourne le contexte ou lève. */
export async function requireAuthAndPermission(
  permission: PermissionCode,
): Promise<AccessContext> {
  const ctx = await getAuthContext();
  requirePermission(authorization, ctx, permission);
  return ctx!;
}

/** Réponse d'erreur normalisée. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation échouée", issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof Error && err.name === "SettingsError") {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof Error && err.name === "HotelsError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("déjà utilisé") || msg.includes("inconnu")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "ReservationError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("illégale")) return NextResponse.json({ error: msg }, { status: 409 });
    if (msg.includes("déjà réservée")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "GuestError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("existe déjà")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "RoomTypeError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "RoomError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("numéro") || msg.includes("illégale")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "StayError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "FrontDeskError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "HousekeepingError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "MaintenanceError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "LaundryError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "TransportError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("Aucun") || msg.includes("disponible") || msg.includes("terminé") || msg.includes("annulé")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "PosError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("illégale") || msg.includes("payée")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "KitchenError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("illégale")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "CashError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "TipsError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "DiscountsError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "InventoryError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "AccountingError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "BillingError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "CrmError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  if (err instanceof Error && err.name === "LoyaltyError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("insuffisant") || msg.includes("épuisée") || msg.includes("négatif")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "NotificationsError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "AiError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("Quota")) return NextResponse.json({ error: msg }, { status: 429 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "ChannelError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "PortalError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable") || msg.includes("Identifiants") || msg.includes("Mot de passe") || msg.includes("code OTP")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("existe déjà")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "EventsError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("introuvable")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("indisponible")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "BiError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "AdminError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "PublicApiError") {
    const msg = err.message;
    if (msg.includes("invalides") || msg.includes("expirée")) return NextResponse.json({ error: msg }, { status: 401 });
    if (msg.includes("Rate limit")) return NextResponse.json({ error: msg }, { status: 429 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "MobileError") {
    const msg = err.message;
    if (msg.includes("inter-hôtel")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "SaasError") {
    const msg = err.message;
    if (msg.includes("introuvable") || msg.includes("invalide") || msg.includes("expiré") || msg.includes("épuisé")) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("déjà un abonnement")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "SaasAdminError") {
    const msg = err.message;
    if (msg.includes("inconnue")) return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "DevopsError") {
    const msg = err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "CertificationError") {
    const msg = err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (err instanceof Error && err.name === "BootstrapError") {
    const msg = err.message;
    if (msg.includes("déjà initialisé")) return NextResponse.json({ error: msg }, { status: 409 });
    if (msg.includes("Clé de bootstrap invalide") || msg.includes("Identifiants invalides") || msg.includes("2FA") || msg.includes("actuel invalide") || msg.includes("Code 2FA")) return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  console.error("[api] erreur inattendue:", err);
  return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
}
