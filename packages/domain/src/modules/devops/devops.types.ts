/**
 * Module 34 — Production Readiness, DevOps & Sécurité Entreprise : types.
 *
 * Réservé au Super Admin (modules 32-35). Health dashboard, journalisation
 * centralisée, sécurité (rate limiting, rotation secrets), sauvegardes +
 * intégrité, rapport de préparation à la production.
 */

/** Check d'état de santé. */
export interface HealthCheck {
  id: string;
  component: string;
  status: string;
  latencyMs?: number | null;
  region?: string | null;
  detail?: string | null;
  checkedAt: Date;
}

/** Incident de sécurité. */
export interface SecurityIncident {
  id: string;
  type: string;
  severity: string;
  source?: string | null;
  detail?: string | null;
  status: string;
  ip?: string | null;
  resolvedAt?: Date | null;
}

/** Rotation de secret. */
export interface SecretRotation {
  id: string;
  secretKey: string;
  provider?: string | null;
  rotatedAt: Date;
  triggeredBy?: string | null;
  reason?: string | null;
}

/** Vérification d'intégrité de sauvegarde. */
export interface IntegrityCheck {
  id: string;
  backupId?: string | null;
  target: string;
  status: string;
  checksum?: string | null;
  detail?: string | null;
  checkedAt: Date;
}

/** État de santé global (Health Dashboard). */
export interface HealthStatus {
  overall: "HEALTHY" | "DEGRADED" | "DOWN";
  components: Array<{ component: string; status: string; latencyMs?: number | null }>;
  uptime: number; // %
}

/** Rapport de préparation à la production. */
export interface ProductionReadinessReport {
  ready: boolean;
  checks: Array<{ name: string; status: "PASS" | "FAIL" | "WARN"; detail?: string }>;
  summary: { passed: number; failed: number; warnings: number };
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface RunHealthCheckInput {
  component: string;
  status?: string;
  latencyMs?: number | null;
  region?: string | null;
  detail?: string | null;
}

export interface ReportSecurityIncidentInput {
  type: string;
  severity?: string;
  source?: string | null;
  detail?: string | null;
  ip?: string | null;
}

export interface RotateSecretInput {
  secretKey: string;
  provider?: string | null;
  reason?: string | null;
}

export interface RunIntegrityCheckInput {
  backupId?: string | null;
  target: string;
  checksum?: string | null;
}

/** Composants surveillés par le health dashboard. */
export const HEALTH_COMPONENTS = ["app", "supabase", "api", "ota", "ai", "payments", "email", "whatsapp", "sms"] as const;
export type HealthComponent = (typeof HEALTH_COMPONENTS)[number];
