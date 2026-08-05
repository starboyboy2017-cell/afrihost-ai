/**
 * Module 31 — Plateforme Mobile : tableau de bord mobile.
 * (RBAC côté serveur : mobile.view)
 */
type Dashboard = {
  role: string; alerts: number; tasks: number; occupancyRate: number;
  checkinsToday: number; checkoutsToday: number; pendingSync: number;
};
type DeviceRow = { id: string; deviceName?: string | null; platform?: string | null; installId: string; isActive: boolean };

export default async function MobilePage() {
  let dash: Dashboard | null = null;
  let devices: DeviceRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [db, dv] = await Promise.all([
      fetch(`${base}/api/mobile/dashboard?role=MANAGER`, { cache: "no-store" }),
      fetch(`${base}/api/mobile/devices`, { cache: "no-store" }),
    ]);
    if (db.ok) dash = ((await db.json()) as { dashboard?: Dashboard }).dashboard ?? null;
    if (dv.ok) devices = ((await dv.json()) as { devices?: DeviceRow[] }).devices ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">Plateforme Mobile</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 31 — PWA avancée (offline-first, push, installation native). API-first :
        le même backend alimente la PWA et les futures apps Android/iOS.
      </p>

      {dash && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Occupation</h2>
            <p className="mt-1 text-3xl font-bold">{dash.occupancyRate}%</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Arrivées / Départs</h2>
            <p className="mt-1 text-3xl font-bold">{dash.checkinsToday} / {dash.checkoutsToday}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Alertes / Tâches</h2>
            <p className="mt-1 text-3xl font-bold">{dash.alerts} / {dash.tasks}</p>
          </section>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-600">Sync en attente</h2>
            <p className="mt-1 text-3xl font-bold">{dash.pendingSync}</p>
          </section>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">PWA avancée</h2>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li>✅ <strong>Offline-first</strong> : service worker avec cache du shell + page hors-ligne</li>
            <li>✅ <strong>Synchronisation auto</strong> : rejeu des opérations au retour en ligne</li>
            <li>✅ <strong>Notifications push</strong> : enregistrement de tokens (FCM/APNs/web)</li>
            <li>✅ <strong>Installation native</strong> : manifest avec display_override + icônes</li>
            <li>✅ <strong>API-first</strong> : mêmes API pour PWA et apps Android/iOS</li>
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Appareils enregistrés ({devices.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {devices.length === 0 && <p className="text-gray-500">Aucun appareil.</p>}
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.deviceName ?? d.installId.slice(0, 12)} <span className="text-gray-400">({d.platform})</span></span>
                <span className={`text-xs ${d.isActive ? "text-green-600" : "text-gray-400"}`}>{d.isActive ? "actif" : "inactif"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
