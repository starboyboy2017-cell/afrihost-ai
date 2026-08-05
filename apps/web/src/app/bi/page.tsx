/**
 * Module 28 — Reporting & Business Intelligence : tableau de bord.
 * (RBAC côté serveur : bi.view)
 */
type Kpis = {
  occupancyRate: number; adr: number; revpar: number; trevpar: number; totalRevenue: number;
  bookings: number; cancellations: number; noShow: number; avgStayDays: number; soldRooms: number;
};
type DashboardRow = { id: string; name: string; role?: string | null; scope: string };
type ReportRow = { id: string; name: string; category: string; type: string };
type ScheduleRow = { id: string; email: string; frequency: string; format: string; isActive: boolean };

export default async function BiPage() {
  let kpis: Kpis | null = null;
  let dashboards: DashboardRow[] = [];
  let reports: ReportRow[] = [];
  let schedules: ScheduleRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [kp, db, rp, sc] = await Promise.all([
      fetch(`${base}/api/bi/kpis`, { cache: "no-store" }),
      fetch(`${base}/api/bi/dashboards`, { cache: "no-store" }),
      fetch(`${base}/api/bi/reports`, { cache: "no-store" }),
      fetch(`${base}/api/bi/schedules`, { cache: "no-store" }),
    ]);
    if (kp.ok) kpis = ((await kp.json()) as { kpis?: Kpis }).kpis ?? null;
    if (db.ok) dashboards = ((await db.json()) as { dashboards?: DashboardRow[] }).dashboards ?? [];
    if (rp.ok) reports = ((await rp.json()) as { reports?: ReportRow[] }).reports ?? [];
    if (sc.ok) schedules = ((await sc.json()) as { schedules?: ScheduleRow[] }).schedules ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Reporting & Business Intelligence</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 28 — tableaux de bord dynamiques par rôle, KPI (ADR, RevPAR, TRevPAR, occupation),
        rapports opérationnels/financiers/commerciaux, multi-hôtels, exports PDF/Excel/CSV,
        planification par email. Isolation par hôtel.
      </p>

      {kpis && (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Taux d&apos;occupation</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.occupancyRate.toFixed(1)}%</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">ADR</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.adr}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">RevPAR</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.revpar}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">TRevPAR</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.trevpar}</p>
          </section>
        </div>
      )}

      {kpis && (
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Revenus totaux</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.totalRevenue}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Réservations</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.bookings}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Annulations / No-show</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.cancellations} / {kpis.noShow}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Séjour moyen (j)</h2>
            <p className="mt-1 text-3xl font-bold">{kpis.avgStayDays}</p>
          </section>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Tableaux de bord ({dashboards.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {dashboards.length === 0 && <p className="text-gray-500">Aucun tableau de bord.</p>}
            {dashboards.map((d) => (
              <li key={d.id}>{d.name} <span className="text-gray-400">({d.role ?? "tous"} · {d.scope})</span></li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Rapports ({reports.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {reports.length === 0 && <p className="text-gray-500">Aucun rapport.</p>}
            {reports.map((r) => (
              <li key={r.id}>{r.name} <span className="text-gray-400">({r.category} · {r.type})</span></li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Planifications ({schedules.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {schedules.length === 0 && <p className="text-gray-500">Aucune planification email.</p>}
            {schedules.map((s) => (
              <li key={s.id}>{s.email} · {s.frequency} · {s.format} <span className={s.isActive ? "text-green-600" : "text-gray-400"}>{s.isActive ? "actif" : "inactif"}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
