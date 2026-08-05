/**
 * Module 15 — Caisse : écran.
 * (RBAC côté serveur : caisse.view)
 */
type SessionRow = {
  id: string; registerId: string; status: string; openingAmount: number;
  closingAmount?: number | null; countedAmount?: number | null; difference?: number | null; openedAt: string;
};

export default async function CashPage() {
  let sessions: SessionRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/cash/sessions`, { cache: "no-store" });
    if (res.ok) sessions = ((await res.json()) as { sessions?: SessionRow[] }).sessions ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Caisse</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 15 — caisses, sessions d&apos;ouverture/fermeture, mouvements, clôture avec réconciliation.
        Isolation par hôtel.
      </p>

      {sessions.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucune session. Ouvrez-en une via l&apos;API (`POST /api/cash/sessions`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Ouverture</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Fonds</th>
              <th className="py-2 pr-3">Théorique</th>
              <th className="py-2 pr-3">Compté</th>
              <th className="py-2">Écart</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-2 pr-3">{new Date(s.openedAt).toLocaleString()}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-2 pr-3">{(s.openingAmount / 100).toFixed(2)}</td>
                <td className="py-2 pr-3">{s.closingAmount !== null ? (s.closingAmount! / 100).toFixed(2) : "—"}</td>
                <td className="py-2 pr-3">{s.countedAmount !== null ? (s.countedAmount! / 100).toFixed(2) : "—"}</td>
                <td className="py-2">{s.difference !== null && s.difference !== undefined ? (s.difference! / 100).toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
