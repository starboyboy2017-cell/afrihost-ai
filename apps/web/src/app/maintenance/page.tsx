/**
 * Module 10 — Maintenance & interventions : écran.
 * (RBAC côté serveur : maintenance.update)
 */
type ReqRow = {
  id: string; title: string; roomNumber?: string | null; status: string;
  priority: string; assignedTo?: string | null; description?: string | null;
  putRoomOutOfOrder: boolean; roomRestored: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-purple-100 text-purple-700",
};

export default async function MaintenancePage() {
  let requests: ReqRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/maintenance`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { requests?: ReqRow[] };
      requests = data.requests ?? [];
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Maintenance & interventions</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 10 — tickets de maintenance (cycle Open → Closed), liaison chambre, mise hors service
        automatique et remise en service à la clôture. Isolation par hôtel.
      </p>

      {requests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Aucun ticket. Créez-en via l&apos;API (`POST /api/maintenance`).</p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Titre</th>
              <th className="py-2 pr-3">Chambre</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Priorité</th>
              <th className="py-2 pr-3">Technicien</th>
              <th className="py-2">Chambre</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{r.title}</td>
                <td className="py-2 pr-3">{r.roomNumber ?? "—"}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-2 pr-3">{r.priority}</td>
                <td className="py-2 pr-3">{r.assignedTo ?? "—"}</td>
                <td className="py-2 text-xs">
                  {r.putRoomOutOfOrder ? (r.roomRestored ? "restaurée" : "hors service") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
