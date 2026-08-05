/**
 * Module 35 — Certification : port de persistance / introspection.
 */
import type { PlatformStats } from "./certification.types.js";

export interface CertificationRepository {
  /** Statistiques globales de la plateforme. */
  getPlatformStats(): Promise<PlatformStats>;
  /** Nombre de tables en base. */
  countTables(): Promise<number>;
  /** Vérifie que des migrations ont été enregistrées (existence du dossier appliqué). */
  hasAppliedMigrations(): Promise<boolean>;
  /** Comptes Super Admin. */
  countSuperAdmins(): Promise<number>;
  /** Comptes actifs / inactifs. */
  countInactiveUsers(): Promise<number>;
  /** Vérifie l'isolation : nombre d'organisations avec hôtels. */
  organisationsWithHotels(): Promise<number>;
}
