/**
 * Module 28 — Reporting & BI : validation (zod).
 */
import { z } from "zod";
import type { CreateDashboardInput, CreateReportInput, CreateScheduleInput } from "./bi.types.js";

const json = z.record(z.string(), z.unknown()).optional();

export const createDashboardSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  role: z.string().trim().optional().nullable(),
  scope: z.string().trim().default("HOTEL"),
  layout: json,
}).strict();

export const createReportSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  category: z.string().trim().default("OPERATIONAL"),
  type: z.string().trim().min(1, "Type requis"),
  filters: json,
  groupBy: z.string().trim().optional().nullable(),
}).strict();

export const createScheduleSchema = z.object({
  reportId: z.string().min(1).optional().nullable(),
  email: z.string().email("Email invalide"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  format: z.enum(["PDF", "EXCEL", "CSV"]).optional(),
  time: z.string().trim().optional().nullable(),
}).strict();

export function validateCreateDashboard(input: CreateDashboardInput): CreateDashboardInput {
  return createDashboardSchema.parse(input) as CreateDashboardInput;
}
export function validateCreateReport(input: CreateReportInput): CreateReportInput {
  return createReportSchema.parse(input) as CreateReportInput;
}
export function validateCreateSchedule(input: CreateScheduleInput): CreateScheduleInput {
  return createScheduleSchema.parse(input) as CreateScheduleInput;
}
