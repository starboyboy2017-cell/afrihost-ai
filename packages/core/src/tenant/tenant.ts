/**
 * Contexte multitenant (ADR-005).
 *
 * L'isolation entre hôtels est **garantie à deux niveaux** :
 *   1. Applicatif : chaque requête porte un `TenantContext` (organisation + hôtel) résolu
 *      depuis la session/JWT et les membreships.
 *   2. Base de données : les policies RLS filtrent par `hotel_id = auth_hotel_id()`.
 *
 * Toute écriture métier DOIT passer par un `TenantContext` valide. Les services refusent
 * de travailler sans contexte (defense in depth).
 */

/** Contexte de locataire courant. */
export interface TenantContext {
  organisationId: string;
  hotelId: string;
  /** Identifiant de l'appareil (pour la sync offline). */
  deviceId?: string;
}

/** Erreur si le contexte tenant est absent/invalide. */
export class MissingTenantError extends Error {
  constructor(message = "Contexte hôtel manquant ou invalide") {
    super(message);
    this.name = "MissingTenantError";
  }
}

/** Résout le contexte tenant (implémentation par défaut : provient de la requête/session). */
export type TenantResolver = () => TenantContext | null;

/** Portée de validation : exige un contexte tenant valide. */
export function assertTenant(ctx: TenantContext | null): asserts ctx is TenantContext {
  if (!ctx || !ctx.organisationId || !ctx.hotelId) {
    throw new MissingTenantError();
  }
}

/** Vérifie que deux contextes désignent le même hôtel (protection anti fuite). */
export function sameTenant(a: TenantContext, b: TenantContext): boolean {
  return a.organisationId === b.organisationId && a.hotelId === b.hotelId;
}
