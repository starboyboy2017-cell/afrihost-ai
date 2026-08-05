/**
 * Sous-module 33.1 — Bootstrap : validation (zod).
 */
import { z } from "zod";
import type {
  BootstrapFirstSuperAdminInput,
  ChangeSuperAdminPasswordInput,
  Enable2FAInput,
  SuperAdminLoginInput,
} from "./bootstrap.types.js";

export const bootstrapFirstSuperAdminSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(12, "Mot de passe : 12 caractères minimum"),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  bootstrapKey: z.string().min(1, "Clé de bootstrap requise"),
}).strict();

export const superAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional().nullable(),
}).strict();

export const changeSuperAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, "Mot de passe : 12 caractères minimum"),
}).strict();

export const enable2FASchema = z.object({
  code: z.string().length(6, "Code à 6 chiffres"),
  secret: z.string().min(1),
}).strict();

export function validateBootstrapFirstSuperAdmin(input: BootstrapFirstSuperAdminInput): BootstrapFirstSuperAdminInput {
  return bootstrapFirstSuperAdminSchema.parse(input) as BootstrapFirstSuperAdminInput;
}
export function validateSuperAdminLogin(input: SuperAdminLoginInput): SuperAdminLoginInput {
  return superAdminLoginSchema.parse(input) as SuperAdminLoginInput;
}
export function validateChangeSuperAdminPassword(input: ChangeSuperAdminPasswordInput): ChangeSuperAdminPasswordInput {
  return changeSuperAdminPasswordSchema.parse(input) as ChangeSuperAdminPasswordInput;
}
export function validateEnable2FA(input: Enable2FAInput): Enable2FAInput {
  return enable2FASchema.parse(input) as Enable2FAInput;
}
