/**
 * Module 20 — Paiements & facturation : écran folios.
 * (RBAC côté serveur : billing.folio)
 */
type FolioRow = { id: string; folioRef: string; name?: string | null; status: string; currency: string; groupRef?: string | null };

export default async function BillingPage() {
  let folios: FolioRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/billing/folios`, { cache: "no-store" });
    if (res.ok) folios = ((await res.json()) as { folios?: FolioRow[] }).folios ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Paiements & facturation</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 20 — folios clients, encaissements multimoyens, transfert/fusion, facturation consolidée.
        Isolation par hôtel.
      </p>

      {folios.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun folio. Créez-en via l&apos;API (`POST /api/billing/folios`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Réf.</th>
              <th className="py-2 pr-3">Nom</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Devise</th>
              <th className="py-2">Groupe</th>
            </tr>
          </thead>
          <tbody>
            {folios.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{f.folioRef}</td>
                <td className="py-2 pr-3">{f.name ?? "—"}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                    {f.status}
                  </span>
                </td>
                <td className="py-2 pr-3">{f.currency}</td>
                <td className="py-2">{f.groupRef ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
