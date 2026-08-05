/**
 * Module 28 — Reporting & Business Intelligence : types du domaine.
 *
 * Tableaux de bord dynamiques, KPI, rapports (opérationnels/financiers/
 * commerciaux/analytiques/personnalisés), filtres avancés, exports PDF/Excel/CSV,
 * planification par email, tableaux de bord multi-hôtels.
 */

/** Tableau de bord. */
export interface BiDashboard {
  id: string;
  hotelId: string;
  name: string;
  role?: string | null;
  scope: string;
  layout?: Record<string, unknown> | null;
  isActive: boolean;
}

/** Rapport. */
export interface BiReport {
  id: string;
  hotelId: string;
  name: string;
  category: string;
  type: string;
  filters?: Record<string, unknown> | null;
  groupBy?: string | null;
}

/** Planification d'envoi. */
export interface BiSchedule {
  id: string;
  hotelId: string;
  reportId?: string | null;
  email: string;
  frequency: string;
  format: string;
  time?: string | null;
  isActive: boolean;
  lastRunAt?: Date | null;
}

/** Indicateurs clés (KPI) d'un hôtel sur une période. */
export interface HotelKpis {
  hotelId: string;
  from: string;
  to: string;
  occupancyRate: number; // %
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
  trevpar: number; // Total Revenue Per Available Room
  totalRevenue: number;
  roomRevenue: number;
  otherRevenue: number;
  bookings: number;
  cancellations: number;
  noShow: number;
  avgStayDays: number;
  availableRooms: number;
  soldRooms: number;
}

/** Points de série temporelle pour un graphique. */
export interface TimeSeriesPoint {
  label: string;
  value: number;
}

/** Résultat d'un rapport généré. */
export interface ReportResult {
  reportId: string;
  name: string;
  category: string;
  type: string;
  rows: Record<string, unknown>[];
  summary: Record<string, number>;
}

// ---------------------------------------------------------------------------
//  INPUTS
// ---------------------------------------------------------------------------

export interface CreateDashboardInput {
  name: string;
  role?: string | null;
  scope?: string;
  layout?: Record<string, unknown>;
}

export interface CreateReportInput {
  name: string;
  category?: string;
  type: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
}

export interface CreateScheduleInput {
  reportId?: string | null;
  email: string;
  frequency?: string;
  format?: string;
  time?: string | null;
}

/** Filtres de requête KPI / rapport. */
export interface KpiFilter {
  from?: string;
  to?: string;
  hotelIds?: string[]; // multi-hôtels
}

/** Source de données KPI (déjà filtrée par RLS côté adapter). */
export interface KpiDataSource {
  reservations: Array<{
    amount: number; status: string; arrivalDate: Date; departureDate: Date;
    roomTypeId?: string | null; adults?: number; children?: number;
  }>;
  otherRevenue: number;
  availableRooms: number;
}
