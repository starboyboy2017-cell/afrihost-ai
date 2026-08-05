/**
 * Module 29 — Administration & Paramétrage Global : service métier.
 *
 * Centre d'administration SaaS : configuration dynamique par catégorie, scoped
 * SAAS (global) ou HOTEL (par établissement). Couvre devises, langues, fuseaux,
 * taxes, politiques de réservation, facturation, fournisseurs (paiement, email,
 * SMS, WhatsApp, IA), OTA, fidélité, sauvegardes, sécurité, métier.
 *
 * Toute la configuration est dynamique (clé/valeur JSON), multi-hôtel,
 * extensible (nouvelles catégories/clés sans code). Isolation multihôtel +
 * RBAC admin.*. Chaque mutation est journalisée (audit).
 */
import { type AuditTrail, type EventBus } from "@afrihost/core";
import { AdminError } from "./admin.error.js";
import { CURRENCIES, LANGUAGES, TIMEZONES } from "./admin.catalogs.js";
import type { AdminRepository } from "./admin.repository.js";
import type {
  AdminCategory,
  AdminConfig,
  ConfigScope,
  ListConfigFilter,
  SetConfigInput,
} from "./admin.types.js";
import { normalizeListFilter, validateSetConfig } from "./admin.validation.js";

/** Contexte d'acteur (audit + isolation multitenant). */
export interface AdminActor {
  organisationId: string;
  hotelId: string;
  actorUserId?: string;
}

export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /** Définit (upsert) une valeur de configuration. */
  async setConfig(hotelId: string, input: SetConfigInput, actor: AdminActor): Promise<AdminConfig> {
    const v = validateSetConfig(input);
    const scope: ConfigScope = v.scope ?? "HOTEL";
    // Isolation : une config HOTEL appartient à l'hôtel de l'acteur ; SAAS = admin plateforme.
    if (scope === "HOTEL" && v.hotelId && v.hotelId !== hotelId) {
      throw new AdminError("Accès inter-hôtel refusé");
    }
    const config = await this.repo.setConfig({ ...v, scope, hotelId: scope === "HOTEL" ? hotelId : null });
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "admin.config.set", entityType: "AdminConfig", entityId: config.id, after: { category: v.category, key: v.key, scope } });
    return config;
  }

  /** Liste les configurations d'un hôtel (ou SaaS global). */
  async listConfigs(hotelId: string, filter: ListConfigFilter, actor: AdminActor): Promise<AdminConfig[]> {
    const f = normalizeListFilter(filter);
    // Un acteur hôtel ne peut lister que ses propres configs HOTEL ou le SaaS global (lecture).
    if (f.scope === "HOTEL" && f.hotelId && f.hotelId !== hotelId) throw new AdminError("Accès inter-hôtel refusé");
    return this.repo.listConfigs(f);
  }

  /** Résout la valeur effective (hôtel d'abord, sinon SaaS global). */
  async getEffective(hotelId: string, category: AdminCategory, key: string, actor: AdminActor): Promise<unknown> {
    const hotel = await this.repo.getConfig("HOTEL", hotelId, category, key);
    if (hotel && hotel.isActive) return hotel.value;
    const saas = await this.repo.getConfig("SAAS", null, category, key);
    return saas?.isActive ? saas.value : null;
  }

  async setConfigActive(hotelId: string, configId: string, isActive: boolean, actor: AdminActor): Promise<void> {
    await this.repo.setConfigActive(configId, isActive);
    await this.audit.write({ organisationId: actor.organisationId, hotelId, actorUserId: actor.actorUserId, action: "admin.config.toggle", entityType: "AdminConfig", entityId: configId, after: { isActive } });
  }

  async deleteConfig(hotelId: string, configId: string, actor: AdminActor): Promise<void> {
    await this.repo.deleteConfig(configId);
  }

  // ---------------------------------------------------------------------------
  // Catalogues de référence
  // ---------------------------------------------------------------------------

  /** Liste les devises disponibles. */
  currencies(): { code: string; name: string; symbol: string }[] {
    return CURRENCIES;
  }

  /** Liste les langues disponibles. */
  languages(): { code: string; name: string }[] {
    return LANGUAGES;
  }

  /** Liste les fuseaux horaires disponibles. */
  timezones(): { id: string; label: string }[] {
    return TIMEZONES;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertHotel(hotelId: string, actor: AdminActor): void {
    if (actor.hotelId !== hotelId) throw new AdminError("Accès inter-hôtel refusé");
  }
}
