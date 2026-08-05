/**
 * Module Guests — Clients : types du domaine.
 */

/** Client (guest). */
export interface Guest {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  idDocument?: string | null;
  idDocumentType?: string | null;
  birthDate?: Date | null;
  address?: string | null;
  tags?: string[];
  notes?: string | null;
  isVip?: boolean;
  loyaltyPoints?: number;
  loyaltyTier?: string | null;
  preferredLanguage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  /** Archivé (soft-delete) quand non nul. */
  archivedAt?: Date | null;
}

/** Saisie de création. */
export interface CreateGuestInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  idDocument?: string | null;
  idDocumentType?: string | null;
  birthDate?: Date | string | null;
  address?: string | null;
  tags?: string[];
  notes?: string | null;
  isVip?: boolean;
  preferredLanguage?: string | null;
}

/** Mise à jour partielle. */
export interface UpdateGuestInput {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  idDocument?: string | null;
  idDocumentType?: string | null;
  birthDate?: Date | string | null;
  address?: string | null;
  tags?: string[];
  notes?: string | null;
  isVip?: boolean;
  preferredLanguage?: string | null;
}

/** Critères de recherche. */
export interface GuestFilter {
  hotelId: string;
  /** Recherche rapide : nom, email, téléphone, pièce d'identité. */
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

/** Résultat de recherche paginé. */
export interface GuestPage {
  guests: Guest[];
  total: number;
}

/** Un séjour (réservation passée) d'un client. */
export interface GuestStay {
  reservationId: string;
  bookingRef: string;
  arrivalDate: Date;
  departureDate: Date;
  status: string;
  roomId?: string | null;
}
