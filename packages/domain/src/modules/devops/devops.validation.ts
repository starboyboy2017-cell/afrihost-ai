/**
 * Module 34 — DevOps & Sécurité Entreprise : validation (zod).
 */
import { z } from "zod";
import type { ReportSecurityIncidentInput, RotateSecretInput, RunHealthCheckInput, RunIntegrityCheckInput } from "./devops.types.js";

export const runHealthCheckSchema = z.object({
  component: z.string().min(1),
  status: z.enum(["UP", "DOWN", "DEGRADED", "WARNING"]).optional(),
  latencyMs: z.number().int().min(0).optional().nullable(),
  region: z.string().trim().optional().nullable(),
  detail: z.string().trim().optional().nullable(),
}).strict();

export const reportSecurityIncidentSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  source: z.string().trim().optional().nullable(),
  detail: z.string().trim().optional().nullable(),
  ip: z.string().trim().optional().nullable(),
}).strict();

export const rotateSecretSchema = z.object({
  secretKey: z.string().min(1),
  provider: z.string().trim().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
}).strict();

export const runIntegrityCheckSchema = z.object({
  backupId: z.string().min(1).optional().nullable(),
  target: z.string().min(1),
  checksum: z.string().trim().optional().nullable(),
}).strict();

export function validateRunHealthCheck(input: RunHealthCheckInput): RunHealthCheckInput { return runHealthCheckSchema.parse(input) as RunHealthCheckInput; }
export function validateReportSecurityIncident(input: ReportSecurityIncidentInput): ReportSecurityIncidentInput { return reportSecurityIncidentSchema.parse(input) as ReportSecurityIncidentInput; }
export function validateRotateSecret(input: RotateSecretInput): RotateSecretInput { return rotateSecretSchema.parse(input) as RotateSecretInput; }
export function validateRunIntegrityCheck(input: RunIntegrityCheckInput): RunIntegrityCheckInput { return runIntegrityCheckSchema.parse(input) as RunIntegrityCheckInput; }
