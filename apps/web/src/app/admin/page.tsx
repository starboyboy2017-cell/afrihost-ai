/**
 * Module 29 — Administration & Paramétrage Global.
 * (RBAC côté serveur : admin.view)
 */
type ConfigRow = { id: string; scope: string; category: string; key: string; value: unknown; isActive: boolean };
type CatalogItem = { code?: string; name: string; symbol?: string; id?: string; label?: string };

export default async function AdminPage() {
  let configs: ConfigRow[] = [];
  let currencies: CatalogItem[] = [];
  let languages: CatalogItem[] = [];
  let timezones: CatalogItem[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [cf, cu, lg, tz] = await Promise.all([
      fetch(`${base}/api/admin/config`, { cache: "no-store" }),
      fetch(`${base}/api/admin/catalogs/currencies`, { cache: "no-store" }),
      fetch(`${base}/api/admin/catalogs/languages`, { cache: "no-store" }),
      fetch(`${base}/api/admin/catalogs/timezones`, { cache: "no-store" }),
    ]);
    if (cf.ok) configs = ((await cf.json()) as { configs?: ConfigRow[] }).configs ?? [];
    if (cu.ok) currencies = ((await cu.json()) as { data?: CatalogItem[] }).data ?? [];
    if (lg.ok) languages = ((await lg.json()) as { data?: CatalogItem[] }).data ?? [];
    if (tz.ok) timezones = ((await tz.json()) as { data?: CatalogItem[] }).data ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const categories = [...new Set(configs.map((c) => c.category))];

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Administration & Paramétrage Global</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 29 — centre d&apos;administration SaaS : configuration dynamique par catégorie
        (SaaS global + par hôtel). Devises, langues, fuseaux, taxes, facturation, fournisseurs,
        sécurité, métier. Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Devises</h2>
          <p className="mt-1 text-3xl font-bold">{currencies.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Langues</h2>
          <p className="mt-1 text-3xl font-bold">{languages.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fuseaux</h2>
          <p className="mt-1 text-3xl font-bold">{timezones.length}</p>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Configurations ({configs.length})</h2>
        {configs.length === 0 && <p className="mt-2 text-sm text-gray-500">Aucune configuration définie.</p>}
        {categories.map((cat) => (
          <div key={cat} className="mt-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-gray-600 capitalize">{cat}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {configs.filter((c) => c.category === cat).map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <span><code>{c.key}</code> <span className="text-gray-400">= {JSON.stringify(c.value)}</span></span>
                  <span className="text-xs text-gray-400">{c.scope} · {c.isActive ? "actif" : "inactif"}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
