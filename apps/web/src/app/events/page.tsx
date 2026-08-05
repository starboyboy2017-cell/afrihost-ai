/**
 * Module 27 — Événements & Groupes : tableau de bord.
 * (RBAC côté serveur : events.view)
 */
type GroupRow = { id: string; name: string; type: string; status: string; roomsAllocated: number; totalRooms: number };
type VenueRow = { id: string; name: string; capacity: number; basePrice: number; currency: string; isActive: boolean };
type EventRow = { id: string; name: string; eventType: string; status: string; expectedAttendees: number; venueId?: string | null };
type ContractRow = { id: string; title: string; contractType: string; amount: number; currency: string; status: string };
type OrderRow = { id: string; department: string; title: string; status: string };

export default async function EventsPage() {
  let groups: GroupRow[] = [];
  let venues: VenueRow[] = [];
  let events: EventRow[] = [];
  let contracts: ContractRow[] = [];
  let orders: OrderRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [gr, ve, ev, ct, od] = await Promise.all([
      fetch(`${base}/api/events/groups`, { cache: "no-store" }),
      fetch(`${base}/api/events/venues`, { cache: "no-store" }),
      fetch(`${base}/api/events`, { cache: "no-store" }),
      fetch(`${base}/api/events/contracts`, { cache: "no-store" }),
      fetch(`${base}/api/events/service-orders`, { cache: "no-store" }),
    ]);
    if (gr.ok) groups = ((await gr.json()) as { groups?: GroupRow[] }).groups ?? [];
    if (ve.ok) venues = ((await ve.json()) as { venues?: VenueRow[] }).venues ?? [];
    if (ev.ok) events = ((await ev.json()) as { events?: EventRow[] }).events ?? [];
    if (ct.ok) contracts = ((await ct.json()) as { contracts?: ContractRow[] }).contracts ?? [];
    if (od.ok) orders = ((await od.json()) as { orders?: OrderRow[] }).orders ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const confirmedGroups = groups.filter((g) => g.status === "CONFIRMED").length;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Événements & Groupes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 27 — groupes, entreprises & organisateurs, événements/séminaires, salles, équipements,
        contrats/devis, ordres de service, coordination housekeeping/restauration/transport.
        Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Groupes confirmés</h2>
          <p className="mt-1 text-3xl font-bold">{confirmedGroups}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Salles</h2>
          <p className="mt-1 text-3xl font-bold">{venues.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Événements</h2>
          <p className="mt-1 text-3xl font-bold">{events.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Ordres de service</h2>
          <p className="mt-1 text-3xl font-bold">{orders.length}</p>
        </section>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Groupes ({groups.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {groups.length === 0 && <p className="text-gray-500">Aucun groupe.</p>}
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between">
                <span><strong>{g.name}</strong> <span className="text-gray-400">({g.type})</span></span>
                <span className="text-xs">{g.roomsAllocated}/{g.totalRooms} ch. · {g.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Événements ({events.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {events.length === 0 && <p className="text-gray-500">Aucun événement.</p>}
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <span><strong>{e.name}</strong> <span className="text-gray-400">({e.eventType} · {e.expectedAttendees} pers.)</span></span>
                <span className="text-xs">{e.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Salles ({venues.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {venues.length === 0 && <p className="text-gray-500">Aucune salle.</p>}
            {venues.map((v) => (
              <li key={v.id}>{v.name} · {v.capacity} places · {v.basePrice} {v.currency}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Contrats / devis ({contracts.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {contracts.length === 0 && <p className="text-gray-500">Aucun contrat.</p>}
            {contracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>{c.title} <span className="text-gray-400">({c.contractType})</span></span>
                <span className="text-xs">{c.amount} {c.currency} · {c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Ordres de service par département ({orders.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {orders.length === 0 && <p className="text-gray-500">Aucun ordre de service.</p>}
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between">
              <span><strong>{o.title}</strong> <span className="text-gray-400">({o.department})</span></span>
              <span className="text-xs">{o.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
