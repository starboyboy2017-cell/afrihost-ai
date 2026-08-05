/**
 * Module 21 — CRM : écran.
 * (RBAC côté serveur : crm.view)
 */
type SegmentRow = { id: string; name: string; description?: string | null; criteria?: unknown };
type CompanyRow = { id: string; name: string; type: string };
type CampaignRow = { id: string; name: string; channel: string; status: string };

export default async function CrmPage() {
  let segments: SegmentRow[] = [];
  let companies: CompanyRow[] = [];
  let campaigns: CampaignRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [seg, co, camp] = await Promise.all([
      fetch(`${base}/api/crm/segments`, { cache: "no-store" }),
      fetch(`${base}/api/crm/companies`, { cache: "no-store" }),
      fetch(`${base}/api/crm/campaigns`, { cache: "no-store" }),
    ]);
    if (seg.ok) segments = ((await seg.json()) as { segments?: SegmentRow[] }).segments ?? [];
    if (co.ok) companies = ((await co.json()) as { companies?: CompanyRow[] }).companies ?? [];
    if (camp.ok) campaigns = ((await camp.json()) as { campaigns?: CampaignRow[] }).campaigns ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">CRM</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 21 — vue 360 client, segmentation, campagnes multicanal, préférences, interactions.
        Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Segments ({segments.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {segments.length === 0 && <p className="text-gray-500">Aucun segment.</p>}
            {segments.map((s) => <li key={s.id}>{s.name}</li>)}
          </ul>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Entreprises ({companies.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {companies.length === 0 && <p className="text-gray-500">Aucune entreprise.</p>}
            {companies.map((c) => <li key={c.id}>{c.name} <span className="text-gray-400">({c.type})</span></li>)}
          </ul>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Campagnes ({campaigns.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {campaigns.length === 0 && <p className="text-gray-500">Aucune campagne.</p>}
            {campaigns.map((c) => <li key={c.id}>{c.name} · {c.channel} · {c.status}</li>)}
          </ul>
        </section>
      </div>
    </main>
  );
}
