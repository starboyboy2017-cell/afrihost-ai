/**
 * Module 19 — Comptabilité générale : écran.
 * (RBAC côté serveur : accounting.view)
 */
type AccountRow = { id: string; code: string; name: string; type: string; nature: string };

export default async function AccountingPage() {
  let accounts: AccountRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/accounting/accounts`, { cache: "no-store" });
    if (res.ok) accounts = ((await res.json()) as { accounts?: AccountRow[] }).accounts ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Comptabilité générale</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 19 — plan comptable configurable (SYSCOHADA révisé / OHADA / UEMOA par configuration),
        journaux, écritures, périodes, balance, grand livre. Isolation par hôtel.
      </p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Plan comptable ({accounts.length} comptes)</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-1 pr-3">Code</th>
              <th className="py-1 pr-3">Libellé</th>
              <th className="py-1 pr-3">Type</th>
              <th className="py-1">Nature</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-1 pr-3 font-mono">{a.code}</td>
                <td className="py-1 pr-3">{a.name}</td>
                <td className="py-1 pr-3">{a.type}</td>
                <td className="py-1">{a.nature}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
