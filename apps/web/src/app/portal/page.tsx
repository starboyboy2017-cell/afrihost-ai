/**
 * Module 26 — Portail client : tableau de bord (PWA).
 * (RBAC côté serveur : portal.self_reservation)
 */
type Dashboard = {
  guestId: string; firstName: string; lastName: string; email?: string | null; phone?: string | null;
  loyaltyPoints: number; loyaltyTier: string | null;
  upcomingReservations: Array<{ id: string; bookingRef: string; status: string; arrivalDate: string; departureDate: string; amount: number; currency: string }>;
  pastReservations: Array<{ id: string; bookingRef: string; status: string; arrivalDate: string }>;
  openFolios: number; unreadMessages: number; unreadNotifications: number; openServiceRequests: number;
};
type Message = { id: string; subject?: string | null; body: string; direction: string };
type ServiceRequest = { id: string; kind: string; title: string; status: string };

export default async function PortalPage() {
  let dash: Dashboard | null = null;
  let messages: Message[] = [];
  let requests: ServiceRequest[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [db, ms, sr] = await Promise.all([
      fetch(`${base}/api/portal/dashboard`, { cache: "no-store" }),
      fetch(`${base}/api/portal/messages`, { cache: "no-store" }),
      fetch(`${base}/api/portal/service-requests`, { cache: "no-store" }),
    ]);
    if (db.ok) dash = ((await db.json()) as { dashboard?: Dashboard }).dashboard ?? null;
    if (ms.ok) messages = ((await ms.json()) as { messages?: Message[] }).messages ?? [];
    if (sr.ok) requests = ((await sr.json()) as { requests?: ServiceRequest[] }).requests ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon espace client</h1>
          <p className="mt-1 text-sm text-gray-500">
            {dash ? `${dash.firstName} ${dash.lastName}` : "—"} · Portail PWA, utilisable sur ordinateur, tablette et mobile.
          </p>
        </div>
        {dash && (
          <div className="rounded-lg border px-4 py-2 text-center">
            <div className="text-lg font-bold">{dash.loyaltyPoints} pts</div>
            <div className="text-xs text-gray-500">{dash.loyaltyTier ?? "—"}</div>
          </div>
        )}
      </div>

      {dash && (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Réservations à venir</h2>
            <p className="mt-1 text-3xl font-bold">{dash.upcomingReservations.length}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Folios ouverts</h2>
            <p className="mt-1 text-3xl font-bold">{dash.openFolios}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Messages non lus</h2>
            <p className="mt-1 text-3xl font-bold">{dash.unreadMessages}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Demandes en cours</h2>
            <p className="mt-1 text-3xl font-bold">{dash.openServiceRequests}</p>
          </section>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Réservations à venir</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(!dash || dash.upcomingReservations.length === 0) && <p className="text-gray-500">Aucune réservation à venir.</p>}
            {dash?.upcomingReservations.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span><code>{r.bookingRef}</code> · {new Date(r.arrivalDate).toLocaleDateString()} → {new Date(r.departureDate).toLocaleDateString()}</span>
                <span className="text-xs font-semibold">{r.amount} {r.currency}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Messagerie sécurisée ({messages.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {messages.length === 0 && <p className="text-gray-500">Aucun message.</p>}
            {messages.slice(0, 6).map((m) => (
              <li key={m.id}><span className="font-medium">{m.subject ?? "Message"}</span> · {m.body.slice(0, 60)}…</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Demandes de services ({requests.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {requests.length === 0 && <p className="text-gray-500">Aucune demande.</p>}
          {requests.map((r) => (
            <li key={r.id}><span className="font-medium">{r.title}</span> <span className="text-gray-400">({r.kind} · {r.status})</span></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
