/**
 * Module 29 — Administration & Paramétrage Global : validation (zod).
 */
import { z } from "zod";
import { ADMIN_CATEGORIES } from "./admin.types.js";
import type { ListConfigFilter, SetConfigInput } from "./admin.types.js";

const configValue = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.null(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

export const setConfigSchema = z.object({
  category: z.enum(ADMIN_CATEGORIES),
  key: z.string().trim().min(1, "Clé requise").max(120),
  value: configValue,
  scope: z.enum(["SAAS", "HOTEL"]).optional(),
  hotelId: z.string().min(1).optional().nullable(),
}).strict();

export function validateSetConfig(input: SetConfigInput): SetConfigInput {
  return setConfigSchema.parse(input) as SetConfigInput;
}

export function normalizeListFilter(f: ListConfigFilter): ListConfigFilter {
  return {
    category: f.category,
    scope: f.scope ?? "HOTEL",
    hotelId: f.hotelId ?? null,
  };
}
