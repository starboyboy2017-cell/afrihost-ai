/**
 * Module 33 — Super Administration : port de persistance.
 */
import type {
  AddSupportMessageInput,
  CreateBackupInput,
  CreateSupportTicketInput,
  RunMonitorCheckInput,
  SaasBackup,
  SaasImpersonation,
  SaasLicense,
  SaasMetrics,
  SaasMonitorCheck,
  SaasSupportMessage,
  SaasSupportTicket,
  StartImpersonationInput,
} from "./saasadmin.types.js";

export interface SaasAdminRepository {
  // Hôtels (gestion / activité)
  createHotel(organisationId: string, input: { name: string; code: string; city?: string | null; country?: string | null }): Promise<{ id: string; name: string }>;
  listHotels(): Promise<Array<{ id: string; name: string; code: string; isActive: boolean }>>;
  getHotel(hotelId: string): Promise<{ id: string; name: string; code: string; isActive: boolean } | null>;
  setHotelActive(hotelId: string, isActive: boolean): Promise<void>;
  /** Suppression logique : marque l'hôtel inactif (delete=true) ou le restaure. */
  setHotelDeleted(hotelId: string, deleted: boolean): Promise<void>;
  countHotels(): Promise<number>;

  // Licences
  createLicense(input: { organisationId: string; subscriptionId?: string | null; licenseKey: string; expiresAt?: Date | null; quotas: { ai: number; email: number; sms: number; whatsapp: number; api: number } }): Promise<SaasLicense>;
  listLicenses(status?: string): Promise<SaasLicense[]>;
  getLicenseByOrg(organisationId: string): Promise<SaasLicense | null>;
  revokeLicense(licenseId: string): Promise<void>;

  // Support
  createSupportTicket(input: CreateSupportTicketInput & { createdBy?: string }): Promise<SaasSupportTicket>;
  listSupportTickets(status?: string): Promise<SaasSupportTicket[]>;
  getSupportTicket(ticketId: string): Promise<SaasSupportTicket | null>;
  updateSupportTicket(ticketId: string, data: Partial<{ status: string; priority: string; assignedTo: string; slaDueAt: Date }>): Promise<void>;
  addSupportMessage(input: AddSupportMessageInput & { authorId?: string }): Promise<SaasSupportMessage>;
  listSupportMessages(ticketId: string): Promise<SaasSupportMessage[]>;

  // Monitoring
  runMonitorCheck(input: RunMonitorCheckInput): Promise<SaasMonitorCheck>;
  listMonitorChecks(target?: string, limit?: number): Promise<SaasMonitorCheck[]>;

  // Sauvegardes
  createBackup(input: CreateBackupInput): Promise<SaasBackup>;
  listBackups(): Promise<SaasBackup[]>;
  markBackupStatus(backupId: string, status: string, completedAt?: Date): Promise<void>;

  // Impersonation
  startImpersonation(input: StartImpersonationInput & { superAdminId: string }): Promise<SaasImpersonation>;
  endImpersonation(impersonationId: string): Promise<void>;
  listImpersonations(superAdminId: string): Promise<SaasImpersonation[]>;

  // Métriques / tableau de bord
  getMetrics(): Promise<SaasMetrics | null>;
  recordMetrics(m: Omit<SaasMetrics, "id">): Promise<SaasMetrics>;
  computeAggregates(): Promise<{
    totalHotels: number; activeHotels: number; suspendedHotels: number; totalUsers: number;
    totalRooms: number; totalBookings: number; revenue: number;
  }>;
}
