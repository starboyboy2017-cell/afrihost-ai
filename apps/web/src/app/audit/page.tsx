/**
 * Module 4 — Journal d'audit : écran de consultation.
 * (RBAC côté serveur : audit.view)
 */
type Entry = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  createdAt: string;
  after?: unknown;
};

export default async function AuditPage() {
  let entries: Entry[] = [];
  let total = 0;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/audit`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { entries?: Entry[]; total?: number };
      entries = data.entries ?? [];
      total = data.total ?? 0;
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal d'audit</h1>
          <p className="mt-1 text-sm text-gray-500">
            Module 4 — traçabilité immuable des actions ({total} entrées). Append-only (aucune modification).
          </p>
        </div>
        <a
          href="/api/audit?export=csv"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Exporter CSV
        </a>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Aucune entrée d'audit pour l'instant.</p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Action</th>
              <th className="py-2 pr-3">Entité</th>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2">Acteur</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-3 font-medium">{e.action}</td>
                <td className="py-2 pr-3">{e.entityType}</td>
                <td className="py-2 pr-3 text-gray-500">{e.entityId ?? "—"}</td>
                <td className="py-2 text-gray-500">{e.actorUserId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
