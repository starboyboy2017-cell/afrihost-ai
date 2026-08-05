/**
 * Module 12 — Transport, navettes & transferts : écran.
 * (RBAC côté serveur : transport.view)
 */
type TransferRow = {
  id: string; transferRef: string; type: string; status: string;
  pickupLocation: string; dropoffLocation: string; scheduledAt: string;
  paxCount: number; amount: number; currency?: string | null; invoicedToReservation: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function TransportPage() {
  let transfers: TransferRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/transport/transfers`, { cache: "no-store" });
    if (res.ok) transfers = ((await res.json()) as { transfers?: TransferRow[] }).transfers ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Transport & transferts</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 12 — véhicules (internes/externes), chauffeurs, réservations de transferts, affectation.
        Isolation par hôtel.
      </p>

      {transfers.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun transfert. Créez-en via l&apos;API (`POST /api/transport/transfers`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Réf.</th>
              <th className="py-2 pr-3">Trajet</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Pax</th>
              <th className="py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{t.transferRef}</td>
                <td className="py-2 pr-3">{t.pickupLocation} → {t.dropoffLocation}</td>
                <td className="py-2 pr-3">{t.type}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status] ?? "bg-gray-100"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-2 pr-3">{new Date(t.scheduledAt).toLocaleString()}</td>
                <td className="py-2 pr-3">{t.paxCount}</td>
                <td className="py-2 text-right">
                  {(t.amount / 100).toFixed(2)} {t.currency} {t.invoicedToReservation ? "· facturé" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
