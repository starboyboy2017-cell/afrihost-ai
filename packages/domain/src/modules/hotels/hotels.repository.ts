/**
 * Module 2 — Gestion multihôtels : port de persistance.
 * Le service dépend de cette interface (pas de Prisma) → testable et découplé.
 */

import type {
  CreateHotelInput,
  Hotel,
  HotelSummary,
  MembershipAssignment,
  UpdateHotelInput,
} from "./hotels.types.js";

export interface HotelsRepository {
  createHotel(organisationId: string, input: CreateHotelInput): Promise<Hotel>;
  updateHotel(hotelId: string, input: UpdateHotelInput): Promise<Hotel>;
  setHotelActive(hotelId: string, isActive: boolean): Promise<Hotel>;
  getHotel(hotelId: string): Promise<Hotel | null>;
  getHotelBySlug(slug: string): Promise<Hotel | null>;
  getHotelByCode(code: string): Promise<Hotel | null>;
  listHotelsForOrganisation(organisationId: string): Promise<Hotel[]>;
  /** Hôtels accessibles à un utilisateur (pour le sélecteur), avec leur rôle. */
  listHotelsForUser(userId: string): Promise<HotelSummary[]>;
  /** Résout l'id d'un rôle système par code, dans une organisation. */
  findRoleIdByCode(organisationId: string, roleCode: string): Promise<string | null>;
  /** Affecte un utilisateur à un hôtel avec un rôle (per-hotel RBAC). */
  assignMembership(assignment: MembershipAssignment): Promise<void>;
  /** Crée la membership par défaut d'un créateur d'hôtel (rôle HOTEL_OWNER). */
  ensureOwnerMembership(userId: string, hotelId: string, roleId: string): Promise<void>;
}
