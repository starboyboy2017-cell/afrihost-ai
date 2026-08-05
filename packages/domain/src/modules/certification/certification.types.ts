/**
 * Module 35 — Finalisation, Audit Global & Go-Live : types.
 *
 * Audit global de la plateforme (cohérence, base de données, sécurité,
 * fonctionnel), nettoyage, optimisation, vérification du parcours SaaS et
 * rapport final de certification. Réservé au Super Admin.
 */

/** Résultat d'un contrôle d'audit. */
export interface AuditCheck {
  category: string;
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  detail?: string;
}

/** Rapport d'audit global. */
export interface AuditReport {
  generatedAt: Date;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: AuditCheck[];
  byCategory: Record<string, { total: number; passed: number; failed: number; warnings: number }>;
}

/** Rapport de certification final. */
export interface CertificationReport {
  certified: boolean;
  platform: string;
  version: string;
  modules: string[];
  features: string[];
  securityLevel: string;
  compliance: string[];
  performance: string[];
  improvementAreas: string[];
  productionReady: boolean;
  audit: AuditReport;
}

/** Résultat d'une simulation du parcours SaaS. */
export interface SaasJourneyResult {
  steps: Array<{ step: string; status: "PASS" | "SKIPPED" | "WARN"; detail?: string }>;
  complete: boolean;
}

/** Statistiques globales. */
export interface PlatformStats {
  hotels: number;
  users: number;
  rooms: number;
  reservations: number;
  guests: number;
  modules: number;
  migrations: number;
  tables: number;
}
