/**
 * Module 25 — Channel Manager / OTA : tableau de bord.
 * (RBAC côté serveur : channel.view)
 */
type AccountRow = { id: string; name: string; otaKey: string; isActive: boolean; lastSyncAt?: string | null; lastError?: string | null };
type MappingRow = { id: string; accountId: string; roomTypeId: string; otaRoomId: string; otaRoomName?: string | null; isActive: boolean };
type JobRow = { id: string; type: string; direction: string; status: string; attempts: number };
type LogRow = { id: string; level: string; message: string };
type Stats = { totalJobs: number; success: number; failed: number; pending: number; logs: number };

export default async function ChannelPage() {
  let accounts: AccountRow[] = [];
  let mappings: MappingRow[] = [];
  let jobs: JobRow[] = [];
  let logs: LogRow[] = [];
  let stats: Stats = { totalJobs: 0, success: 0, failed: 0, pending: 0, logs: 0 };
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [ac, mp, jb, lg, st] = await Promise.all([
      fetch(`${base}/api/channel/accounts`, { cache: "no-store" }),
      fetch(`${base}/api/channel/mappings`, { cache: "no-store" }),
      fetch(`${base}/api/channel/jobs`, { cache: "no-store" }),
      fetch(`${base}/api/channel/logs`, { cache: "no-store" }),
      fetch(`${base}/api/channel/stats`, { cache: "no-store" }),
    ]);
    if (ac.ok) accounts = ((await ac.json()) as { accounts?: AccountRow[] }).accounts ?? [];
    if (mp.ok) mappings = ((await mp.json()) as { mappings?: MappingRow[] }).mappings ?? [];
    if (jb.ok) jobs = ((await jb.json()) as { jobs?: JobRow[] }).jobs ?? [];
    if (lg.ok) logs = ((await lg.json()) as { logs?: LogRow[] }).logs ?? [];
    if (st.ok) stats = ((await st.json()) as { stats?: Stats }).stats ?? stats;
  } catch {
    // hors-ligne / non connecté
  }

  const activeAccounts = accounts.filter((a) => a.isActive).length;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Channel Manager (OTA)</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 25 — synchronisation bidirectionnelle avec les OTA via un <strong>moteur de connecteurs générique</strong>
        (Booking.com, Expedia, Airbnb, Agoda, Hotelbeds...). Provider-agnostic : chaque OTA est un connecteur
        indépendant. Disponibilités, tarifs, restrictions, réservations. Isolation par hôtel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Comptes OTA actifs</h2>
          <p className="mt-1 text-3xl font-bold">{activeAccounts}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Mappings</h2>
          <p className="mt-1 text-3xl font-bold">{mappings.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Jobs réussis</h2>
          <p className="mt-1 text-3xl font-bold">{stats.success}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">En attente / échecs</h2>
          <p className="mt-1 text-3xl font-bold">{stats.pending} / {stats.failed}</p>
        </section>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Comptes OTA ({accounts.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {accounts.length === 0 && <p className="text-gray-500">Aucun compte OTA configuré.</p>}
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{a.name} <span className="text-gray-400">({a.otaKey})</span></span>
                <span className="text-xs">
                  <span className={a.isActive ? "text-green-600" : "text-gray-400"}>{a.isActive ? "actif" : "inactif"}</span>
                  {a.lastError && <span className="ml-1 text-red-500">· erreur</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Jobs récents ({jobs.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {jobs.length === 0 && <p className="text-gray-500">Aucun job de synchronisation.</p>}
            {jobs.slice(0, 10).map((j) => (
              <li key={j.id} className="flex items-center justify-between">
                <span>{j.direction} · {j.type}</span>
                <span className="text-xs"><span className={j.status === "FAILED" ? "text-red-600" : "text-green-600"}>{j.status}</span> · {j.attempts} essai(s)</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Logs récents ({logs.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {logs.length === 0 && <p className="text-gray-500">Aucun log.</p>}
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} className="flex items-start justify-between">
                <span className={l.level === "ERROR" ? "text-red-600" : "text-gray-600"}>{l.message}</span>
                <span className="text-xs text-gray-400">{l.level}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Mappings chambres ({mappings.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {mappings.length === 0 && <p className="text-gray-500">Aucun mapping chambre PMS ↔ OTA.</p>}
            {mappings.map((m) => (
              <li key={m.id}><code>{m.roomTypeId.slice(0, 8)}</code> → <code>{m.otaRoomId}</code> <span className="text-gray-400">({m.otaRoomName ?? "OTA"})</span></li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
