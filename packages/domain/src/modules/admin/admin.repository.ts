/**
 * Module 29 — Administration & Paramétrage Global : port de persistance.
 */
import type { AdminConfig, ListConfigFilter, SetConfigInput } from "./admin.types.js";

export interface AdminRepository {
  setConfig(input: SetConfigInput): Promise<AdminConfig>;
  listConfigs(filter: ListConfigFilter): Promise<AdminConfig[]>;
  getConfig(scope: "SAAS" | "HOTEL", hotelId: string | null, category: string, key: string): Promise<AdminConfig | null>;
  setConfigActive(id: string, isActive: boolean): Promise<void>;
  deleteConfig(id: string): Promise<void>;
}
