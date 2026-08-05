/**
 * Module 17 — Remises, promotions & coupons : écran.
 * (RBAC côté serveur : discounts.view)
 */
type RuleRow = { id: string; name: string; code?: string | null; type: string; value: number; scope: string; roleCap?: number | null; isActive: boolean };

export default async function DiscountsPage() {
  let rules: RuleRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/discounts/rules`, { cache: "no-store" });
    if (res.ok) rules = ((await res.json()) as { rules?: RuleRow[] }).rules ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Remises, promotions & coupons</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 17 — moteur de règles flexible (PMS/POS/caisse/facturation), plafonds par rôle, conditions,
        coupons. Isolation par hôtel.
      </p>

      {rules.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucune règle. Créez-en via l&apos;API (`POST /api/discounts/rules`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Nom</th>
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Valeur</th>
              <th className="py-2 pr-3">Portée</th>
              <th className="py-2 pr-3">Plafond rôle</th>
              <th className="py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{r.name}</td>
                <td className="py-2 pr-3">{r.code ?? "—"}</td>
                <td className="py-2 pr-3">{r.type}</td>
                <td className="py-2 pr-3">{r.type === "PERCENT" ? `${r.value}%` : r.value}</td>
                <td className="py-2 pr-3">{r.scope}</td>
                <td className="py-2 pr-3">{r.roleCap !== null && r.roleCap !== undefined ? r.roleCap : "—"}</td>
                <td className="py-2">{r.isActive ? "Actif" : "Inactif"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
