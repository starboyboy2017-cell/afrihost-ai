/**
 * Module 33 — Super Administration (SaaS Control Center).
 * (RBAC côté serveur : saasadmin.dashboard — exclusivement Super Admin)
 */
type Dashboard = {
  totalHotels: number; activeHotels: number; suspendedHotels: number; totalUsers: number;
  totalRooms: number; totalBookings: number; revenue: number; mrr: number; arr: number;
};
type HotelRow = { id: string; name: string; code: string; isActive: boolean };
type TicketRow = { id: string; subject: string; status: string; priority: string; hotelId?: string | null };
type CheckRow = { id: string; target: string; name: string; status: string; latencyMs?: number | null };
type ImpRow = { id: string; targetUserId: string; hotelId: string; reason?: string | null; endedAt?: string | null };

export default async function SaasAdminPage() {
  let dash: Dashboard | null = null;
  let hotels: HotelRow[] = [];
  let tickets: TicketRow[] = [];
  let checks: CheckRow[] = [];
  let imps: ImpRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [db, ht, tk, ch, im] = await Promise.all([
      fetch(`${base}/api/saasadmin/dashboard`, { cache: "no-store" }),
      fetch(`${base}/api/saasadmin/hotels`, { cache: "no-store" }),
      fetch(`${base}/api/saasadmin/support/tickets`, { cache: "no-store" }),
      fetch(`${base}/api/saasadmin/monitoring`, { cache: "no-store" }),
      fetch(`${base}/api/saasadmin/impersonation`, { cache: "no-store" }),
    ]);
    if (db.ok) dash = ((await db.json()) as { dashboard?: Dashboard }).dashboard ?? null;
    if (ht.ok) hotels = ((await ht.json()) as { hotels?: HotelRow[] }).hotels ?? [];
    if (tk.ok) tickets = ((await tk.json()) as { tickets?: TicketRow[] }).tickets ?? [];
    if (ch.ok) checks = ((await ch.json()) as { checks?: CheckRow[] }).checks ?? [];
    if (im.ok) imps = ((await im.json()) as { impersonations?: ImpRow[] }).impersonations ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Super Administration — SaaS Control Center</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 33 — <strong>exclusivement accessible depuis le portail Super Administration</strong>.
        Pilotage global de la plateforme : hôtels, licences, support, monitoring, sauvegardes, impersonation.
      </p>

      {dash && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Hôtels (actifs/suspendus)</h2>
            <p className="mt-1 text-3xl font-bold">{dash.totalHotels} <span className="text-base text-green-600">({dash.activeHotels})</span> <span className="text-base text-red-500">({dash.suspendedHotels})</span></p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">MRR / ARR</h2>
            <p className="mt-1 text-3xl font-bold">{dash.mrr} <span className="text-base text-gray-400">/ {dash.arr}</span></p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Chambres / Réservations</h2>
            <p className="mt-1 text-3xl font-bold">{dash.totalRooms} / {dash.totalBookings}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Utilisateurs / Revenus</h2>
            <p className="mt-1 text-3xl font-bold">{dash.totalUsers} / {dash.revenue}</p>
          </section>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Hôtels ({hotels.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {hotels.length === 0 && <p className="text-gray-500">Aucun hôtel.</p>}
            {hotels.map((h) => (
              <li key={h.id} className="flex items-center justify-between">
                <span>{h.name} <span className="text-gray-400">({h.code})</span></span>
                <span className={`text-xs ${h.isActive ? "text-green-600" : "text-red-500"}`}>{h.isActive ? "actif" : "suspendu"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Support — Tickets ({tickets.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {tickets.length === 0 && <p className="text-gray-500">Aucun ticket.</p>}
            {tickets.map((t) => (
              <li key={t.id}>{t.subject} <span className="text-gray-400">({t.priority} · {t.status})</span></li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Monitoring ({checks.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {checks.length === 0 && <p className="text-gray-500">Aucun check.</p>}
            {checks.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>{c.name} <span className="text-gray-400">({c.target})</span></span>
                <span className={`text-xs ${c.status === "UP" ? "text-green-600" : "text-red-500"}`}>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Impersonation sécurisée (Login As Hotel Admin) — {imps.length}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {imps.length === 0 && <p className="text-gray-500">Aucune impersonation. Chaque accès est journalisé (qui/hôtel/quand/pourquoi).</p>}
          {imps.map((i) => (
            <li key={i.id} className="flex items-center justify-between">
              <span><code>{i.targetUserId.slice(0, 8)}</code> → hôtel <code>{i.hotelId.slice(0, 8)}</code> {i.reason && <span className="text-gray-400">· {i.reason}</span>}</span>
              <span className="text-xs text-gray-400">{i.endedAt ? "terminée" : "en cours"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
