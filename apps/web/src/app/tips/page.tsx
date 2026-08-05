/**
 * Module 16 — Pourboires : écran de suivi.
 * (RBAC côté serveur : tips.view)
 */
type TipRow = {
  id: string; type: string; status: string; amount: number; method: string; createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  VALIDATED: "bg-blue-100 text-blue-700",
  DISTRIBUTED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function TipsPage() {
  let tips: TipRow[] = [];
  let pendingTotal = 0, distributedTotal = 0;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/tips`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { tips?: TipRow[]; pendingTotal?: number; distributedTotal?: number };
      tips = data.tips ?? [];
      pendingTotal = data.pendingTotal ?? 0;
      distributedTotal = data.distributedTotal ?? 0;
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pourboires</h1>
          <p className="mt-1 text-sm text-gray-500">
            Module 16 — enregistrement, répartition (individuel/collectif), validation, distribution. Isolation par hôtel.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="rounded-lg border px-3 py-1"><span className="text-gray-500">En attente</span><br/><b>{(pendingTotal / 100).toFixed(2)}</b></div>
          <div className="rounded-lg border px-3 py-1"><span className="text-gray-500">Distribués</span><br/><b>{(distributedTotal / 100).toFixed(2)}</b></div>
        </div>
      </div>

      {tips.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun pourboire. Enregistrez-en via l&apos;API (`POST /api/tips`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Moyen</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {tips.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2 pr-3">{t.type}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status] ?? "bg-gray-100"}`}>{t.status}</span>
                </td>
                <td className="py-2 pr-3">{t.method}</td>
                <td className="py-2 pr-3">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="py-2 text-right font-medium">{(t.amount / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
