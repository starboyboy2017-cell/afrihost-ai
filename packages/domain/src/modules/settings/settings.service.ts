/**
 * Module 1 — Paramètres généraux : service métier.
 *
 * Responsabilités :
 *   - consulter les réglages d'organisation et d'hôtel ;
 *   - les modifier avec **validation** (zod) ;
 *   - **journaliser** chaque mutation dans le journal d'audit (append-only) ;
 *   - **émettre** des événements de domaine (`settings.changed`, `hotel.updated`) pour
 *     que les autres modules réagissent sans couplage direct.
 *
 * Règles d'accès (BusinessRules.md BR-1, BR-2) :
 *   - Le RBAC (permissions `settings.organisation.*` / `settings.hotel.*`) est vérifié
 *     par les **handlers API** via `requirePermission` ; le service reçoit un contexte
 *     d'acteur (qui/quoi) pour l'audit, et valide la cohérence du tenant multihôtel.
 */

import { DomainEvents, type EventBus } from "@afrihost/core";
import type { AuditTrail } from "@afrihost/core";
import type {
  HotelSettings,
  HotelSettingsPatch,
  OrganisationSettings,
  OrganisationSettingsPatch,
} from "./settings.types.js";
import { validateHotelPatch, validateOrganisationPatch } from "./settings.validation.js";
import type { SettingsRepository } from "./settings.repository.js";

/** Contexte d'acteur minimal pour l'audit et l'isolation multihôtel. */
export interface SettingsActor {
  organisationId: string;
  hotelId?: string;
  actorUserId?: string;
}

export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly audit: AuditTrail,
    private readonly bus: EventBus,
  ) {}

  /** Récupère les réglages d'une organisation. */
  async getOrganisation(organisationId: string): Promise<OrganisationSettings | null> {
    return this.repo.getOrganisation(organisationId);
  }

  /** Liste les hôtels d'une organisation (pour le sélecteur multihôtel). */
  async listHotels(organisationId: string): Promise<HotelSettings[]> {
    return this.repo.listHotelsForOrganisation(organisationId);
  }

  /**
   * Met à jour les réglages d'organisation.
   * @param actor doit posséder l'organisation (isolé par tenant/RBAC au niveau API).
   */
  async updateOrganisation(
    organisationId: string,
    patch: OrganisationSettingsPatch,
    actor: SettingsActor,
  ): Promise<OrganisationSettings> {
    const validated = validateOrganisationPatch(patch);
    const before = await this.repo.getOrganisation(organisationId);
    const after = await this.repo.updateOrganisation(organisationId, validated);
    await this.audit.write({
      organisationId,
      hotelId: actor.hotelId,
      actorUserId: actor.actorUserId,
      action: "settings.organisation.update",
      entityType: "Organisation",
      entityId: organisationId,
      before: before ?? undefined,
      after,
    });
    await this.bus.publish({
      name: DomainEvents.settingsChanged,
      hotelId: actor.hotelId ?? organisationId,
      organisationId,
      data: { scope: "organisation", organisationId },
    });
    return after;
  }

  /**
   * Récupère les réglages d'un hôtel.
   * @param requestedHotelId hôtel ciblé — doit correspondre au tenant de l'acteur.
   */
  async getHotelSettings(requestedHotelId: string, actor: SettingsActor): Promise<HotelSettings | null> {
    if (actor.hotelId && actor.hotelId !== requestedHotelId) {
      throw new SettingsError("Accès inter-hôtel refusé");
    }
    return this.repo.getHotel(requestedHotelId);
  }

  /**
   * Met à jour les réglages d'un hôtel.
   * Isolation : le tenant de l'acteur doit correspondre à l'hôtel ciblé.
   */
  async updateHotelSettings(
    requestedHotelId: string,
    patch: HotelSettingsPatch,
    actor: SettingsActor,
  ): Promise<HotelSettings> {
    if (actor.hotelId && actor.hotelId !== requestedHotelId) {
      throw new SettingsError("Accès inter-hôtel refusé");
    }
    const validated = validateHotelPatch(patch);
    const before = await this.repo.getHotel(requestedHotelId);
    if (!before) throw new SettingsError("Hôtel introuvable");
    const after = await this.repo.updateHotel(requestedHotelId, validated);
    await this.audit.write({
      organisationId: actor.organisationId,
      hotelId: requestedHotelId,
      actorUserId: actor.actorUserId,
      action: "settings.hotel.update",
      entityType: "Hotel",
      entityId: requestedHotelId,
      before,
      after,
    });
    await this.bus.publish({
      name: DomainEvents.hotelUpdated,
      hotelId: requestedHotelId,
      organisationId: actor.organisationId,
      data: { hotelId: requestedHotelId },
    });
    await this.bus.publish({
      name: DomainEvents.settingsChanged,
      hotelId: requestedHotelId,
      organisationId: actor.organisationId,
      data: { scope: "hotel", hotelId: requestedHotelId },
    });
    return after;
  }
}

/** Erreur métier du module settings. */
export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}
