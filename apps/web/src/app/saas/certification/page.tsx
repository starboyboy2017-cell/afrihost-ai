/**
 * Module 35 — Finalisation, Audit Global & Go-Live.
 * (RBAC côté serveur : certification.audit — exclusivement Super Admin)
 */
type Stats = { hotels: number; users: number; rooms: number; reservations: number; guests: number; modules: number; migrations: number; tables: number };
type Audit = { totalChecks: number; passed: number; failed: number; warnings: number; byCategory: Record<string, { total: number; passed: number; failed: number; warnings: number }>; checks: Array<{ category: string; name: string; status: string; detail?: string }> };
type Journey = { steps: Array<{ step: string; status: string; detail?: string }>; complete: boolean };
type Cert = { certified: boolean; productionReady: boolean; modules: string[]; compliance: string[]; securityLevel: string; improvementAreas: string[] };

export default async function CertificationPage() {
  let stats: Stats | null = null;
  let audit: Audit | null = null;
  let journey: Journey | null = null;
  let cert: Cert | null = null;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [st, au, jr, ce] = await Promise.all([
      fetch(`${base}/api/certification/stats`, { cache: "no-store" }),
      fetch(`${base}/api/certification/audit`, { cache: "no-store" }),
      fetch(`${base}/api/certification/journey`, { cache: "no-store" }),
      fetch(`${base}/api/certification/certify`, { cache: "no-store" }),
    ]);
    if (st.ok) stats = ((await st.json()) as { stats?: Stats }).stats ?? null;
    if (au.ok) audit = ((await au.json()) as { audit?: Audit }).audit ?? null;
    if (jr.ok) journey = ((await jr.json()) as { journey?: Journey }).journey ?? null;
    if (ce.ok) cert = ((await ce.json()) as { report?: Cert }).report ?? null;
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Finalisation, Audit Global & Go-Live</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 35 — <strong>exclusivement Super Administration.</strong> Audit global, base de données,
        sécurité, fonctionnel, parcours SaaS, rapport de certification.
      </p>

      {cert && (
        <section className={`mt-6 rounded-lg border p-4 ${cert.productionReady ? "bg-green-50" : "bg-yellow-50"}`}>
          <h2 className="text-xl font-bold">Certification interne</h2>
          <p className="mt-1">
            {cert.productionReady
              ? "🎉 AfriHost AI est officiellement déclaré PRODUCTION READY pour un déploiement commercial."
              : "⚠️ Points restants avant certification."}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded border bg-white p-3">
              <strong>Modules ({cert.modules.length})</strong>
              <p className="mt-1 text-xs text-gray-600">{cert.modules.join(" · ")}</p>
            </div>
            <div className="rounded border bg-white p-3">
              <strong>Conformité</strong>
              <p className="mt-1 text-xs text-gray-600">{cert.compliance.join(" · ")}</p>
              <p className="mt-1 text-xs text-gray-600"><strong>Sécurité :</strong> {cert.securityLevel}</p>
            </div>
          </div>
          <h3 className="mt-3 font-semibold">Points d&apos;amélioration</h3>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
            {cert.improvementAreas.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>
      )}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Hôtels / Utilisateurs</h2>
            <p className="mt-1 text-3xl font-bold">{stats.hotels} / {stats.users}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Chambres / Réservations</h2>
            <p className="mt-1 text-3xl font-bold">{stats.rooms} / {stats.reservations}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Migrations / Tables</h2>
            <p className="mt-1 text-3xl font-bold">{stats.migrations} / {stats.tables}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Modules</h2>
            <p className="mt-1 text-3xl font-bold">{stats.modules}</p>
          </section>
        </div>
      )}

      {audit && (
        <section className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold">Audit global — {audit.passed}✓ / {audit.failed}✗ / {audit.warnings}⚠ ({audit.totalChecks})</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {Object.entries(audit.byCategory).map(([cat, v]) => (
              <div key={cat} className="rounded border bg-gray-50 p-2 text-sm">
                <strong>{cat}</strong>: {v.passed}✓ {v.failed > 0 && `${v.failed}✗ `}{v.warnings > 0 && `${v.warnings}⚠`}
              </div>
            ))}
          </div>
        </section>
      )}

      {journey && (
        <section className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold">Parcours SaaS simulé — {journey.complete ? "complet ✅" : "incomplet"}</h2>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {journey.steps.map((s) => (
              <li key={s.step}>{s.status === "PASS" ? "✅" : "⚠️"} {s.step}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
