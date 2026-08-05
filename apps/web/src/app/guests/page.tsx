/**
 * Module Guests — Clients : écran de recherche/liste.
 * (RBAC côté serveur : guests.view)
 */
type GuestRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  isVip?: boolean;
  archivedAt?: string | null;
};

export default async function GuestsPage() {
  let guests: GuestRow[] = [];
  let total = 0;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/guests`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { guests?: GuestRow[]; total?: number };
      guests = data.guests ?? [];
      total = data.total ?? 0;
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Module Clients — création, modification, archivage, historique des séjours ({total} client(s)).
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Rechercher (nom, email, téléphone, identité)…"
        disabled
        className="mt-4 w-full rounded-md border px-3 py-2 text-sm"
      />

      {guests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun client. Créez-en via l&apos;API (`POST /api/guests`) ou la recherche.
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Nom</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Téléphone</th>
              <th className="py-2 pr-3">Pays</th>
              <th className="py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id} className="border-b">
                <td className="py-2 pr-3 font-medium">
                  {g.lastName} {g.firstName} {g.isVip && <span className="text-amber-500">★</span>}
                </td>
                <td className="py-2 pr-3">{g.email ?? "—"}</td>
                <td className="py-2 pr-3">{g.phone ?? "—"}</td>
                <td className="py-2 pr-3">{g.nationality ?? "—"}</td>
                <td className="py-2">
                  {g.archivedAt ? (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">Archivé</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Actif</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
