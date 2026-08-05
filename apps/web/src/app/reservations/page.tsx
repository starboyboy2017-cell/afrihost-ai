/**
 * Module 3 — Réservations : écran de liste.
 * (RBAC côté serveur : reservations.view)
 */
type ReservationRow = {
  id: string;
  bookingRef: string;
  status: string;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  amount: number;
  currency: string;
};

export default async function ReservationsPage() {
  let reservations: ReservationRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/reservations`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { reservations?: ReservationRow[] };
      reservations = data.reservations ?? [];
    }
  } catch {
    // hors-ligne / non connecté
  }

  const statusColor: Record<string, string> = {
    PROVISIONAL: "bg-gray-100 text-gray-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    CHECKED_IN: "bg-green-100 text-green-700",
    CHECKED_OUT: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-yellow-100 text-yellow-700",
    WAITLIST: "bg-gray-100 text-gray-700",
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Réservations</h1>
      <p className="mt-1 text-sm text-gray-500">Module 3 — suivi et gestion des réservations (isolées par hôtel).</p>

      {reservations.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Aucune réservation. Créez-en une via l&apos;API (`POST /api/reservations`).</p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Réf.</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Arrivée</th>
              <th className="py-2 pr-3">Départ</th>
              <th className="py-2 pr-3">Personnes</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{r.bookingRef}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status] ?? "bg-gray-100"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-2 pr-3">{new Date(r.arrivalDate).toLocaleDateString()}</td>
                <td className="py-2 pr-3">{new Date(r.departureDate).toLocaleDateString()}</td>
                <td className="py-2 pr-3">{r.adults + r.children}</td>
                <td className="py-2 text-right">{(r.amount / 100).toFixed(2)} {r.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
