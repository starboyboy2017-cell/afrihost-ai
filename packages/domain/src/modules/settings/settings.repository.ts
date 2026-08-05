/**
 * Module 1 — Paramètres généraux : port de persistance.
 *
 * Le service métier dépend de cette **interface** (port), pas de Prisma directement.
 * L'implémentation concrète (adapter) vit côté application (apps/web) ou en test (mémoire).
 * Ceci garde le domaine testable et découplé de l'infrastructure.
 */

import type {
  HotelSettings,
  HotelSettingsPatch,
  OrganisationSettings,
  OrganisationSettingsPatch,
} from "./settings.types.js";

export interface SettingsRepository {
  getOrganisation(organisationId: string): Promise<OrganisationSettings | null>;
  updateOrganisation(
    organisationId: string,
    patch: OrganisationSettingsPatch,
  ): Promise<OrganisationSettings>;
  getHotel(hotelId: string): Promise<HotelSettings | null>;
  updateHotel(hotelId: string, patch: HotelSettingsPatch): Promise<HotelSettings>;
  listHotelsForOrganisation(organisationId: string): Promise<HotelSettings[]>;
}
