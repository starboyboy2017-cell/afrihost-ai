/**
 * Module 34 — Production Readiness, DevOps & Sécurité Entreprise.
 * (RBAC côté serveur : devops.report — exclusivement Super Admin)
 */
type Health = { overall: string; uptime: number; components: Array<{ component: string; status: string; latencyMs?: number | null }> };
type IncidentRow = { id: string; type: string; severity: string; status: string; ip?: string | null };
type RotationRow = { id: string; secretKey: string; reason?: string | null };
type IntegrityRow = { id: string; target: string; status: string };
type Report = { ready: boolean; checks: Array<{ name: string; status: string; detail?: string }>; summary: { passed: number; failed: number; warnings: number } };

export default async function DevopsPage() {
  let health: Health | null = null;
  let incidents: IncidentRow[] = [];
  let rotations: RotationRow[] = [];
  let integrity: IntegrityRow[] = [];
  let report: Report | null = null;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [hl, ic, ro, ig, rd] = await Promise.all([
      fetch(`${base}/api/devops/health`, { cache: "no-store" }),
      fetch(`${base}/api/devops/security/incidents`, { cache: "no-store" }),
      fetch(`${base}/api/devops/secrets`, { cache: "no-store" }),
      fetch(`${base}/api/devops/backups/integrity`, { cache: "no-store" }),
      fetch(`${base}/api/devops/readiness`, { cache: "no-store" }),
    ]);
    if (hl.ok) health = ((await hl.json()) as { health?: Health }).health ?? null;
    if (ic.ok) incidents = ((await ic.json()) as { incidents?: IncidentRow[] }).incidents ?? [];
    if (ro.ok) rotations = ((await ro.json()) as { rotations?: RotationRow[] }).rotations ?? [];
    if (ig.ok) integrity = ((await ig.json()) as { checks?: IntegrityRow[] }).checks ?? [];
    if (rd.ok) report = ((await rd.json()) as { report?: Report }).report ?? null;
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">DevOps & Sécurité Entreprise</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 34 — Production Readiness. <strong>Exclusivement Super Administration.</strong>
        Health dashboard, incidents, rotation des secrets, intégrité des sauvegardes, rapport de préparation.
      </p>

      {report && (
        <section className={`mt-6 rounded-lg border p-4 ${report.ready ? "bg-green-50" : "bg-yellow-50"}`}>
          <h2 className="font-semibold">Rapport de préparation à la production</h2>
          <p className="mt-1 text-sm">
            {report.ready ? "✅ PRÊTE pour une utilisation réelle." : "⚠️ Des vérifications restent en attente."}
            {" "}Passés {report.summary.passed} · Échecs {report.summary.failed} · Avertissements {report.summary.warnings}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {report.checks.map((c) => (
              <li key={c.name} className="flex items-center justify-between">
                <span>{c.name} {c.detail && <span className="text-gray-400">— {c.detail}</span>}</span>
                <span className={c.status === "PASS" ? "text-green-600" : c.status === "WARN" ? "text-yellow-600" : "text-red-600"}>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {health && (
        <section className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold">Health Dashboard — {health.overall} · {health.uptime}% uptime</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {health.components.map((c) => (
              <div key={c.component} className={`rounded border p-2 text-sm ${c.status === "UP" ? "bg-green-50" : "bg-red-50"}`}>
                <strong>{c.component}</strong> <span className={c.status === "UP" ? "text-green-600" : "text-red-600"}>{c.status}</span>
                {c.latencyMs != null && <span className="text-gray-400"> · {c.latencyMs}ms</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Incidents de sécurité ({incidents.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {incidents.length === 0 && <p className="text-gray-500">Aucun incident.</p>}
            {incidents.map((i) => (
              <li key={i.id}>{i.type} <span className="text-gray-400">({i.severity} · {i.status})</span></li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Rotations de secrets ({rotations.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {rotations.length === 0 && <p className="text-gray-500">Aucune rotation.</p>}
            {rotations.map((r) => (
              <li key={r.id}><code>{r.secretKey}</code> {r.reason && <span className="text-gray-400">— {r.reason}</span>}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Intégrité sauvegardes ({integrity.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {integrity.length === 0 && <p className="text-gray-500">Aucune vérification.</p>}
            {integrity.map((c) => (
              <li key={c.id}>{c.target} <span className={c.status === "PASSED" ? "text-green-600" : "text-red-600"}>{c.status}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
