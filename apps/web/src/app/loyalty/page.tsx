/**
 * Module 22 — Programme de fidélité : tableau de bord.
 * (RBAC côté serveur : loyalty.view)
 */
type ProgramRow = { id: string; name: string; scope: string; currency: string; pointsPerNight: number; pointsPerSpend: number; validityDays: number; isActive: boolean };
type MemberRow = { id: string; programId: string; guestId: string; pointsBalance: number; lifetimePoints: number; status: string; tierId?: string | null };

export default async function LoyaltyPage() {
  let programs: ProgramRow[] = [];
  let members: MemberRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [pr, mm] = await Promise.all([
      fetch(`${base}/api/loyalty/programs`, { cache: "no-store" }),
      fetch(`${base}/api/loyalty/members`, { cache: "no-store" }),
    ]);
    if (pr.ok) programs = ((await pr.json()) as { programs?: ProgramRow[] }).programs ?? [];
    if (mm.ok) members = ((await mm.json()) as { members?: MemberRow[] }).members ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const totalPoints = members.reduce((s, m) => s + m.pointsBalance, 0);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Programme de fidélité</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 22 — points, niveaux, récompenses, bonus et moteur de règles paramétrable.
        Configurable par hôtel ou groupe d&apos;hôtels, intégré au CRM, réservations, front desk,
        POS, facturation et paiements. Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Programmes actifs</h2>
          <p className="mt-1 text-3xl font-bold">{programs.filter((p) => p.isActive).length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Membres</h2>
          <p className="mt-1 text-3xl font-bold">{members.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Solde total de points</h2>
          <p className="mt-1 text-3xl font-bold">{totalPoints}</p>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Programmes</h2>
        {programs.length === 0 && <p className="mt-2 text-sm text-gray-500">Aucun programme. Créez-en un via l&apos;API (loyalty.manage).</p>}
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {p.isActive ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Portée : {p.scope} · Devise : {p.currency}</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                <li>{p.pointsPerNight} pts / nuit · {p.pointsPerSpend} pts / unité dépensée</li>
                <li>Validité des points : {p.validityDays} jours</li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Membres</h2>
        {members.length === 0 && <p className="mt-2 text-sm text-gray-500">Aucune adhésion pour l&apos;instant.</p>}
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Programme</th>
                <th className="px-4 py-2">Solde</th>
                <th className="px-4 py-2">Points cumulés</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{m.guestId.slice(0, 8)}…</td>
                  <td className="px-4 py-2">{m.programId.slice(0, 8)}…</td>
                  <td className="px-4 py-2 font-semibold">{m.pointsBalance}</td>
                  <td className="px-4 py-2">{m.lifetimePoints}</td>
                  <td className="px-4 py-2">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
