/**
 * Module 34 — DevOps & Sécurité Entreprise : port de persistance.
 */
import type {
  HealthCheck,
  IntegrityCheck,
  ReportSecurityIncidentInput,
  RotateSecretInput,
  RunHealthCheckInput,
  RunIntegrityCheckInput,
  SecretRotation,
  SecurityIncident,
} from "./devops.types.js";

export interface DevopsRepository {
  // Health
  runHealthCheck(input: RunHealthCheckInput): Promise<HealthCheck>;
  listHealthChecks(component?: string, limit?: number): Promise<HealthCheck[]>;
  latestHealthChecks(): Promise<HealthCheck[]>;

  // Sécurité
  reportIncident(input: ReportSecurityIncidentInput): Promise<SecurityIncident>;
  listIncidents(status?: string, limit?: number): Promise<SecurityIncident[]>;
  resolveIncident(incidentId: string): Promise<void>;

  // Secrets
  rotateSecret(input: RotateSecretInput & { triggeredBy?: string }): Promise<SecretRotation>;
  listSecretRotations(limit?: number): Promise<SecretRotation[]>;

  // Intégrité des sauvegardes
  runIntegrityCheck(input: RunIntegrityCheckInput): Promise<IntegrityCheck>;
  listIntegrityChecks(limit?: number): Promise<IntegrityCheck[]>;

  // Compteurs pour le rapport de préparation
  countHotels(): Promise<number>;
  countUsers(): Promise<number>;
  hasMigrationsApplied(): Promise<boolean>;
}
