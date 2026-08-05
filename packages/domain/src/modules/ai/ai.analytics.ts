/**
 * Module 24 — Moteur d'analytique déterministe (rule-based).
 *
 * C'est CE QU'IL FAUT POUR QUE L'APPLICATION FONCTIONNE SANS IA. Chaque
 * "fonctionnalité IA" a ici un équivalent purement déterministe, testable et
 * sans dépendance LLM. L'IA (quand activée) ne fait qu'enrichir ces résultats.
 *
 * Toutes les entrées doivent être **déjà filtrées par RBAC/RLS** côté appelant :
 * ce moteur ne reçoit que les données autorisées de l'hôtel courant.
 */
import type { AiPrediction, AiSuggestion } from "./ai.types.js";

/** Séries temporelles (occupation, revenus) pour prédiction simple. */
export interface TimeSeries {
  values: number[]; // chronologiques, du plus ancien au plus récent
}

/** Données agrégées pour les suggestions opérationnelles. */
export interface OperationalData {
  // Réservations à venir (arrivées/départs)
  checkInsToday?: number;
  checkOutsToday?: number;
  expectedArrivals?: Array<{ guestId: string; roomType?: string | null; spend?: number; vip?: boolean }>;
  // Clients en séjour
  inHouse?: Array<{ guestId: string; nights?: number; spend?: number; vip?: boolean }>;
  // Chambres
  occupiedRooms?: number;
  availableRooms?: number;
  totalRooms?: number;
  // Stock
  lowStockItems?: Array<{ name: string; remaining: number }>;
  // Paiements en retard
  latePayments?: number;
  // Incidents
  openIncidents?: number;
}

// ---------------------------------------------------------------------------
// Prédictions (moyenne mobile simple + tendance)
// ---------------------------------------------------------------------------

/** Moyenne mobile simple (fenêtre par défaut = toutes les valeurs). */
export function movingAverage(values: number[], window = 7): number {
  if (values.length === 0) return 0;
  const w = Math.min(window, values.length);
  const slice = values.slice(-w);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

/** Tendance : variation relative (%) entre la première et la dernière moitié. */
export function trendPercent(values: number[]): number {
  if (values.length < 2) return 0;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const last = values.slice(mid);
  const avgFirst = movingAverage(first, first.length);
  const avgLast = movingAverage(last, last.length);
  if (avgFirst === 0) return 0;
  return ((avgLast - avgFirst) / avgFirst) * 100;
}

/** Prédit la valeur future = dernière moyenne + tendance, borne à 0 min. */
export function predictNext(values: number[], window = 7): number {
  if (values.length === 0) return 0;
  const avg = movingAverage(values, window);
  const trend = trendPercent(values);
  const forecast = avg * (1 + trend / 100);
  return Math.max(0, Math.round(forecast));
}

/** Calcule un niveau de confiance heuristique (0..1) selon le nombre de points. */
export function confidenceFromCount(n: number): number {
  if (n <= 0) return 0;
  if (n >= 14) return 0.9;
  return Math.round((0.3 + (n / 14) * 0.6) * 100) / 100;
}

/** Construit une prédiction d'occupation / revenu déterministe. */
export function buildPrediction(
  metric: string,
  values: number[],
  horizon: string,
  periodStart: Date,
  periodEnd: Date,
): AiPrediction {
  const value = predictNext(values);
  return {
    id: "",
    hotelId: "",
    metric,
    horizon,
    value,
    confidence: confidenceFromCount(values.length),
    model: "rule",
    periodStart,
    periodEnd,
    context: { points: values.length, trendPercent: trendPercent(values) },
    createdAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Alertes (règles simples)
// ---------------------------------------------------------------------------

export interface RuleAlert {
  type: string;
  severity: string;
  title: string;
  detail?: string;
}

/** Détecte les anomalies par règles déterministes. */
export function detectAnomalies(data: OperationalData): RuleAlert[] {
  const alerts: RuleAlert[] = [];
  // Rupture / stock bas
  for (const item of data.lowStockItems ?? []) {
    if (item.remaining <= 0) {
      alerts.push({ type: "stock_shortage", severity: "CRITICAL", title: `Rupture de stock : ${item.name}`, detail: "Plus aucune unité disponible." });
    } else if (item.remaining <= 5) {
      alerts.push({ type: "stock_shortage", severity: "WARNING", title: `Stock bas : ${item.name}`, detail: `Il reste ${item.remaining} unités.` });
    }
  }
  // Paiements en retard
  if ((data.latePayments ?? 0) > 0) {
    alerts.push({ type: "late_payment", severity: "WARNING", title: `${data.latePayments} paiement(s) en retard`, detail: "Des folios clients présentent des paiements en retard." });
  }
  // Chambres indisponibles alors qu'attendu (occupation > capacité attendue)
  const totalRooms = data.totalRooms ?? 0;
  if (totalRooms > 0 && data.availableRooms === 0 && (data.occupiedRooms ?? 0) < totalRooms) {
    alerts.push({ type: "room_unavailable", severity: "WARNING", title: "Chambres indisponibles", detail: "Aucune chambre disponible alors que la capacité n'est pas saturée." });
  }
  // Incidents récurrents (nombre d'incidents ouverts élevé)
  if ((data.openIncidents ?? 0) >= 5) {
    alerts.push({ type: "recurring_incident", severity: "WARNING", title: "Incidents récurrents", detail: `${data.openIncidents} incidents ouverts.` });
  }
  // Surcharge opérationnelle (arrivées+sorties simultanées élevées)
  const arrivals = (data.expectedArrivals ?? []).length;
  const pressure = arrivals + (data.checkOutsToday ?? 0);
  if ((data.totalRooms ?? 0) > 0 && pressure >= Math.ceil((data.totalRooms ?? 0) * 0.5)) {
    alerts.push({ type: "operational_load", severity: "WARNING", title: "Surcharge opérationnelle probable", detail: `${arrivals} arrivées et ${data.checkOutsToday ?? 0} départs le même jour.` });
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Suggestions opérationnelles (règles)
// ---------------------------------------------------------------------------

/** Suggère des actions pour le front desk (check-in/out, upgrade, upsell, cross-sell, fidélité). */
export function buildSuggestions(data: OperationalData): Array<Omit<AiSuggestion, "id" | "hotelId" | "createdAt">> {
  const out: Array<Omit<AiSuggestion, "id" | "hotelId" | "createdAt">> = [];
  const arrivals = data.expectedArrivals ?? [];
  const inHouse = data.inHouse ?? [];
  // Upgrade potentiel : client VIP arrivant quand des chambres supérieures disponibles
  for (const a of arrivals) {
    if (a.vip && (data.availableRooms ?? 0) > 0) {
      out.push({ guestId: a.guestId, kind: "upgrade", title: "Upgrade VIP", detail: `Client VIP arrivant aujourd'hui : proposer un surclassement.`, context: { spend: a.spend }, source: "RULE", status: "NEW" });
    }
  }
  // Upsell : séjour long / forte dépense en cours
  for (const g of inHouse) {
    if ((g.nights ?? 0) >= 3 && (g.spend ?? 0) > 0) {
      out.push({ guestId: g.guestId, kind: "upsell", title: "Upsell SPA / restauration", detail: "Client en séjour prolongé : proposer un forfait SPA ou dîner.", context: { nights: g.nights }, source: "RULE", status: "NEW" });
    }
  }
  // Cross-sell : réservation à venir
  for (const a of arrivals) {
    out.push({ guestId: a.guestId, kind: "cross_sell", title: "Pré-réservation navette", detail: "Arrivée prévue : proposer un transfert aéroport.", context: { roomType: a.roomType }, source: "RULE", status: "NEW" });
  }
  // Fidélisation : client fort dépensier en séjour
  for (const g of inHouse) {
    if ((g.spend ?? 0) >= 100000 && g.vip) {
      out.push({ guestId: g.guestId, kind: "loyalty", title: "Proposer l'adhésion fidélité", detail: "Client à forte valeur : offrir l'enrôlement au programme de fidélité.", source: "RULE", status: "NEW" });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Priorisation de tâches (tri par urgence pondérée)
// ---------------------------------------------------------------------------

export interface TaskForPriority {
  id: string;
  title: string;
  dueInMinutes?: number; // négatif = en retard
  severity: string; // INFO | WARNING | CRITICAL
  category?: string;
}

/** Score de priorité (plus grand = plus urgent). */
export function priorityScore(t: TaskForPriority): number {
  let score = 0;
  const severityWeight = { INFO: 1, WARNING: 3, CRITICAL: 5 }[t.severity] ?? 1;
  score += severityWeight * 10;
  if (t.dueInMinutes !== undefined) {
    if (t.dueInMinutes < 0) score += 50; // en retard
    else score += Math.max(0, 20 - Math.floor(t.dueInMinutes / 60));
  }
  return score;
}

/** Triage par ordre de priorité décroissante. */
export function prioritizeTasks(tasks: TaskForPriority[]): TaskForPriority[] {
  return [...tasks].sort((a, b) => priorityScore(b) - priorityScore(a));
}
