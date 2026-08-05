/**
 * Module 23 — Notifications multicanales : écran d'administration.
 * (RBAC côté serveur : notifications.view)
 */
type ProviderRow = { id: string; name: string; channel: string; providerKey: string; fromAddress?: string | null; isActive: boolean; isDefault: boolean };
type TemplateRow = { id: string; channel: string; code: string; eventType: string; locale: string; isActive: boolean };
type TriggerRow = { id: string; eventType: string; channel: string; templateCode: string; priority: string; isActive: boolean };
type CampaignRow = { id: string; name: string; channel: string; status: string; scheduleAt?: string | null };
type SendRow = { id: string; channel: string; templateCode?: string | null; recipient?: string | null; status: string; attempts: number };

export default async function NotificationsPage() {
  let providers: ProviderRow[] = [];
  let templates: TemplateRow[] = [];
  let triggers: TriggerRow[] = [];
  let campaigns: CampaignRow[] = [];
  let sends: SendRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [pr, tpl, trg, cmp, snd] = await Promise.all([
      fetch(`${base}/api/notifications/providers`, { cache: "no-store" }),
      fetch(`${base}/api/notifications/templates`, { cache: "no-store" }),
      fetch(`${base}/api/notifications/triggers`, { cache: "no-store" }),
      fetch(`${base}/api/notifications/campaigns`, { cache: "no-store" }),
      fetch(`${base}/api/notifications/sends`, { cache: "no-store" }),
    ]);
    if (pr.ok) providers = ((await pr.json()) as { providers?: ProviderRow[] }).providers ?? [];
    if (tpl.ok) templates = ((await tpl.json()) as { templates?: TemplateRow[] }).templates ?? [];
    if (trg.ok) triggers = ((await trg.json()) as { triggers?: TriggerRow[] }).triggers ?? [];
    if (cmp.ok) campaigns = ((await cmp.json()) as { campaigns?: CampaignRow[] }).campaigns ?? [];
    if (snd.ok) sends = ((await snd.json()) as { sends?: SendRow[] }).sends ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const activeProviders = providers.filter((p) => p.isActive).length;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Notifications multicanales</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 23 — Email, SMS, WhatsApp, Push et autres canaux, agnostique fournisseur.
        Fournisseurs, templates multilingues, déclencheurs automatiques, campagnes programmées,
        files d&apos;attente et suivi des statuts. Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fournisseurs actifs</h2>
          <p className="mt-1 text-3xl font-bold">{activeProviders}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Templates</h2>
          <p className="mt-1 text-3xl font-bold">{templates.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Déclencheurs</h2>
          <p className="mt-1 text-3xl font-bold">{triggers.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Envois</h2>
          <p className="mt-1 text-3xl font-bold">{sends.length}</p>
        </section>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Fournisseurs ({providers.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {providers.length === 0 && <p className="text-gray-500">Aucun fournisseur configuré.</p>}
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.name} <span className="text-gray-400">({p.channel} · {p.providerKey})</span></span>
                <span className="text-xs">
                  {p.isDefault && <span className="text-blue-600">défaut </span>}
                  <span className={p.isActive ? "text-green-600" : "text-red-500"}>{p.isActive ? "actif" : "inactif"}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Déclencheurs automatiques ({triggers.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {triggers.length === 0 && <p className="text-gray-500">Aucun déclencheur.</p>}
            {triggers.map((t) => (
              <li key={t.id}>{t.eventType} → {t.channel} ({t.templateCode}) <span className="text-xs text-gray-400">· {t.priority}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Templates multilingues ({templates.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {templates.length === 0 && <p className="text-gray-500">Aucun template.</p>}
            {templates.map((t) => (
              <li key={t.id}>{t.channel} · <code>{t.code}</code> ({t.eventType} · {t.locale})</li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Campagnes ({campaigns.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {campaigns.length === 0 && <p className="text-gray-500">Aucune campagne.</p>}
            {campaigns.map((c) => (
              <li key={c.id}>{c.name} · {c.channel} · {c.status}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Historique des envois ({sends.length})</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">Canal</th>
                <th className="px-4 py-2">Template</th>
                <th className="px-4 py-2">Destinataire</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Tentatives</th>
              </tr>
            </thead>
            <tbody>
              {sends.length === 0 && <tr><td className="px-4 py-2 text-gray-500" colSpan={5}>Aucun envoi.</td></tr>}
              {sends.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">{s.channel}</td>
                  <td className="px-4 py-2">{s.templateCode ?? "—"}</td>
                  <td className="px-4 py-2">{s.recipient ?? s.id.slice(0, 8)}…</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{s.status}</span></td>
                  <td className="px-4 py-2">{s.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
