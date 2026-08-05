/**
 * Module 33 — Super Administration (SaaS Control Center) : types du domaine.
 *
 * Exclusivement pour le Super Admin. Gestion des hôtels, abonnements, tableau de
 * bord SaaS, licences, utilisateurs SaaS, support technique, monitoring, audit,
 * sauvegardes, paramètres globaux, impersonation sécurisée.
 */

/** Licence SaaS. */
export interface SaasLicense {
  id: string;
  organisationId: string;
  subscriptionId?: string | null;
  licenseKey: string;
  status: string;
  activatedAt?: Date | null;
  expiresAt?: Date | null;
  renewedAt?: Date | null;
  quotaAi: number;
  quotaEmail: number;
  quotaSms: number;
  quotaWhatsapp: number;
  quotaApi: number;
  usedAi: number;
  usedEmail: number;
  usedSms: number;
  usedWhatsapp: number;
  usedApi: number;
}

/** Ticket de support. */
export interface SaasSupportTicket {
  id: string;
  organisationId: string;
  hotelId?: string | null;
  subject: string;
  description?: string | null;
  status: string;
  priority: string;
  slaDueAt?: Date | null;
  assignedTo?: string | null;
  createdBy?: string | null;
}

/** Message de support. */
export interface SaasSupportMessage {
  id: string;
  ticketId: string;
  authorId?: string | null;
  body: string;
  isInternal: boolean;
}

/** Check de monitoring. */
export interface SaasMonitorCheck {
  id: string;
  target: string;
  name: string;
  status: string;
  latencyMs?: number | null;
  detail?: string | null;
  checkedAt: Date;
}

/** Sauvegarde. */
export interface SaasBackup {
  id: string;
  name: string;
  type: string;
  status: string;
  sizeBytes?: bigint | null;
  url?: string | null;
  scheduledAt?: Date | null;
  completedAt?: Date | null;
}

/** Impersonation. */
export interface SaasImpersonation {
  id: string;
  superAdminId: string;
  targetUserId: string;
  hotelId: string;
  reason?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
}

/** Métriques SaaS (tableau de bord global). */
export interface SaasMetrics {
  id: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalHotels: number;
  activeHotels: number;
  suspendedHotels: number;
  totalUsers: number;
  totalRooms: number;
  totalBookings: number;
  revenue: number;
  mrr: number;
  arr: number;
  retentionRate: number;
  churnRate: number;
  growth: number;
  aiUsage: number;
  emailUsage: number;
  smsUsage: number;
  whatsappUsage: number;
  apiUsage: number;
  storageUsed: number;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateSupportTicketInput {
  organisationId: string;
  hotelId?: string | null;
  subject: string;
  description?: string | null;
  priority?: string;
}

export interface AddSupportMessageInput {
  ticketId: string;
  body: string;
  isInternal?: boolean;
}

export interface AssignTicketInput {
  ticketId: string;
  assignedTo: string;
}

export interface RunMonitorCheckInput {
  target: string;
  name: string;
  status?: string;
  latencyMs?: number | null;
  detail?: string | null;
}

export interface CreateBackupInput {
  name: string;
  type?: string;
}

export interface StartImpersonationInput {
  targetUserId: string;
  hotelId: string;
  reason?: string | null;
}

export interface HotelActivityInput {
  hotelId: string;
  action: string; // approve | activate | suspend | delete | restore | change_plan | transfer
  detail?: string | null;
}
