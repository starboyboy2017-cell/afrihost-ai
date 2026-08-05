/**
 * Module 30 — API Publique & Marketplace : console développeur.
 * (RBAC côté serveur : publicapi.view)
 */
type AppRow = { id: string; name: string; environment: string; isActive: boolean };
type MarketplaceRow = { id: string; name: string; category: string; version: string; installs: number; isPublished: boolean };

export default async function PublicApiPage() {
  let apps: AppRow[] = [];
  let marketplace: MarketplaceRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [ap, mp] = await Promise.all([
      fetch(`${base}/api/publicapi/apps`, { cache: "no-store" }),
      fetch(`${base}/api/publicapi/marketplace`, { cache: "no-store" }),
    ]);
    if (ap.ok) apps = ((await ap.json()) as { apps?: AppRow[] }).apps ?? [];
    if (mp.ok) marketplace = ((await mp.json()) as { apps?: MarketplaceRow[] }).apps ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">API Publique & Marketplace</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 30 — API REST pour développeurs tiers : OAuth2, API Keys, JWT, Webhooks, versionnement,
        rate limiting, journalisation, environnement Sandbox, marketplace de connecteurs. Isolation par hôtel.
      </p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Documentation OpenAPI</h2>
        <p className="mt-1 text-sm text-gray-500">
          Spécification OpenAPI/Swagger disponible. Endpoints de base : <code>/api/publicapi/apps</code>,
          <code> /api/publicapi/auth</code>, <code> /api/publicapi/webhooks</code>,
          <code> /api/publicapi/marketplace</code>.
        </p>
        <div className="mt-2 rounded bg-gray-50 p-3 font-mono text-xs">
{`POST /api/publicapi/auth         → { clientId, secret }   → contexte OAuth2/JWT
GET  /api/publicapi/apps          → applications (scoped org)
POST /api/publicapi/apps/:id/credentials → API Key (secret une fois)
POST /api/publicapi/webhooks      → enregistrer un webhook
POST /api/publicapi/webhooks/dispatch → déclencher un événement`}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Applications tierces ({apps.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {apps.length === 0 && <p className="text-gray-500">Aucune application.</p>}
            {apps.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{a.name}</span>
                <span className="text-xs text-gray-400">{a.environment} · {a.isActive ? "actif" : "inactif"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Marketplace ({marketplace.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {marketplace.length === 0 && <p className="text-gray-500">Aucun connecteur publié.</p>}
            {marketplace.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>{m.name} <span className="text-gray-400">({m.category} · v{m.version})</span></span>
                <span className="text-xs text-gray-400">{m.installs} installs</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
