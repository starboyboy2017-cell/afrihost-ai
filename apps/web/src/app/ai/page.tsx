/**
 * Module 24 — IA : tableau de bord (assistant, prédictions, alertes).
 * (RBAC côté serveur : ai.view)
 */
type ProviderRow = { id: string; name: string; providerKey: string; model?: string | null; isActive: boolean; isDefault: boolean };
type FeatureRow = { id: string; feature: string; isEnabled: boolean; quotaPerDay: number };
type SuggestionRow = { id: string; kind: string; title: string; source: string; status: string };
type AlertRow = { id: string; severity: string; type: string; title: string; status: string };
type PredictionRow = { id: string; metric: string; value: number; confidence: number; model: string };

export default async function AiPage() {
  let providers: ProviderRow[] = [];
  let features: FeatureRow[] = [];
  let suggestions: SuggestionRow[] = [];
  let alerts: AlertRow[] = [];
  let predictions: PredictionRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [pr, ft, sg, al, pd] = await Promise.all([
      fetch(`${base}/api/ai/providers`, { cache: "no-store" }),
      fetch(`${base}/api/ai/features`, { cache: "no-store" }),
      fetch(`${base}/api/ai/suggestions`, { cache: "no-store" }),
      fetch(`${base}/api/ai/alerts`, { cache: "no-store" }),
      fetch(`${base}/api/ai/predictions`, { cache: "no-store" }),
    ]);
    if (pr.ok) providers = ((await pr.json()) as { providers?: ProviderRow[] }).providers ?? [];
    if (ft.ok) features = ((await ft.json()) as { features?: FeatureRow[] }).features ?? [];
    if (sg.ok) suggestions = ((await sg.json()) as { suggestions?: SuggestionRow[] }).suggestions ?? [];
    if (al.ok) alerts = ((await al.json()) as { alerts?: AlertRow[] }).alerts ?? [];
    if (pd.ok) predictions = ((await pd.json()) as { predictions?: PredictionRow[] }).predictions ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const openAlerts = alerts.filter((a) => a.status === "OPEN").length;
  const enabledFeatures = features.filter((f) => f.isEnabled).length;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">IA — Assistant intelligent</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 24 — couche d&apos;assistance LLM provider-agnostic et <strong>optionnelle</strong> : l&apos;application
        fonctionne parfaitement sans IA (règles déterministes). Assistant, prédictions, alertes,
        suggestions, recommandations, priorisation, RAG-ready. Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fournisseurs LLM</h2>
          <p className="mt-1 text-3xl font-bold">{providers.filter((p) => p.isActive).length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fonctionnalités activées</h2>
          <p className="mt-1 text-3xl font-bold">{enabledFeatures}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Alertes ouvertes</h2>
          <p className="mt-1 text-3xl font-bold">{openAlerts}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Suggestions</h2>
          <p className="mt-1 text-3xl font-bold">{suggestions.length}</p>
        </section>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fournisseurs LLM ({providers.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {providers.length === 0 && <p className="text-gray-500">Aucun fournisseur LLM configuré — l&apos;assistant utilise le fallback déterministe.</p>}
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.name} <span className="text-gray-400">({p.providerKey} · {p.model ?? "modèle par défaut"})</span></span>
                <span className="text-xs">
                  {p.isDefault && <span className="text-blue-600">défaut </span>}
                  <span className={p.isActive ? "text-green-600" : "text-red-500"}>{p.isActive ? "actif" : "inactif"}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fonctionnalités ({features.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {features.length === 0 && <p className="text-gray-500">Aucune fonctionnalité configurée.</p>}
            {features.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <span>{f.feature}</span>
                <span className="text-xs">
                  <span className={f.isEnabled ? "text-green-600" : "text-gray-400"}>{f.isEnabled ? "activée" : "désactivée"}</span>
                  <span className="text-gray-400"> · quota {f.quotaPerDay}/j</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Suggestions ({suggestions.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {suggestions.length === 0 && <p className="text-gray-500">Aucune suggestion.</p>}
            {suggestions.map((s) => (
              <li key={s.id}><span className="font-medium">{s.title}</span> <span className="text-gray-400">({s.kind} · {s.source})</span></li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Alertes ({alerts.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {alerts.length === 0 && <p className="text-gray-500">Aucune alerte.</p>}
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span><span className={`mr-1 rounded px-1 text-xs ${a.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{a.severity}</span>{a.title}</span>
                <span className="text-xs text-gray-400">{a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Prédictions ({predictions.length})</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">Métrique</th>
                <th className="px-4 py-2">Valeur</th>
                <th className="px-4 py-2">Confiance</th>
                <th className="px-4 py-2">Modèle</th>
              </tr>
            </thead>
            <tbody>
              {predictions.length === 0 && <tr><td className="px-4 py-2 text-gray-500" colSpan={4}>Aucune prédiction.</td></tr>}
              {predictions.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{p.metric}</td>
                  <td className="px-4 py-2 font-semibold">{p.value}</td>
                  <td className="px-4 py-2">{(p.confidence * 100).toFixed(0)}%</td>
                  <td className="px-4 py-2">{p.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
