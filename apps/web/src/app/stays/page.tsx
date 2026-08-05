/**
 * Module 7 — Séjours actifs (check-in/check-out) : écran.
 * (RBAC côté serveur : reservations.view)
 */
type StayRow = {
  stay: { id: string; reservationId: string; status: string; checkInAt: string; departureDate: string; roomId: string | null };
  bookingRef: string;
  guestName?: string | null;
  roomNumber?: string | null;
  roomTypeName?: string | null;
};

export default async function StaysPage() {
  let stays: StayRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/stays`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { stays?: StayRow[] };
      stays = data.stays ?? [];
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Séjours actifs</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 7 — check-in / check-out, prolongation, changement de chambre. Alimente le tableau de disponibilité.
      </p>

      {stays.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun séjour actif. Effectuez un check-in via l&apos;API (`POST /api/reservations/:id/checkin`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Réf.</th>
              <th className="py-2 pr-3">Client</th>
              <th className="py-2 pr-3">Chambre</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Arrivée</th>
              <th className="py-2">Départ</th>
            </tr>
          </thead>
          <tbody>
            {stays.map((s) => (
              <tr key={s.stay.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{s.bookingRef}</td>
                <td className="py-2 pr-3">{s.guestName ?? "—"}</td>
                <td className="py-2 pr-3">{s.roomNumber ?? "—"}</td>
                <td className="py-2 pr-3">{s.roomTypeName ?? "—"}</td>
                <td className="py-2 pr-3">{new Date(s.stay.checkInAt).toLocaleDateString()}</td>
                <td className="py-2">{new Date(s.stay.departureDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
