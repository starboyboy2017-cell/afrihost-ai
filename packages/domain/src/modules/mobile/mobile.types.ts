/**
 * Module 31 — Plateforme Mobile : types du domaine.
 *
 * PWA avancée (offline-first, sync auto, push, installation native) + API-first
 * pour futures apps Android/iOS. Le même backend alimente toutes les surfaces.
 */

/** Appareil mobile enregistré. */
export interface MobileDevice {
  id: string;
  hotelId: string;
  userId?: string | null;
  guestId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  installId: string;
  lastActiveAt?: Date | null;
  isActive: boolean;
}

/** Token de notification push. */
export interface PushToken {
  id: string;
  hotelId: string;
  deviceId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  platform?: string | null;
  token: string;
  isActive: boolean;
}

/** Journal de synchronisation offline. */
export interface MobileSyncLog {
  id: string;
  hotelId: string;
  deviceId?: string | null;
  entityType: string;
  entityId: string;
  operation: string;
  status: string;
  error?: string | null;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface RegisterDeviceInput {
  installId: string;
  deviceName?: string | null;
  platform?: string | null;
  userId?: string | null;
  guestId?: string | null;
}

export interface RegisterPushTokenInput {
  deviceId?: string | null;
  platform?: string | null;
  token: string;
  userId?: string | null;
  guestId?: string | null;
}

export interface SyncOperation {
  entityType: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
}

/** Tableau de bord mobile (par rôle). */
export interface MobileDashboard {
  role: string; // STAFF | MANAGER | GUEST
  alerts: number;
  tasks: number;
  occupancyRate: number;
  checkinsToday: number;
  checkoutsToday: number;
  pendingSync: number;
}
